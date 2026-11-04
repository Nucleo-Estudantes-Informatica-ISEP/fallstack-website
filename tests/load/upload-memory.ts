// Reproducible service-level comparison against the exact pre-change git source.
// Uses real MinIO via a streaming metering proxy and two independent app hosts.
import { execFileSync, fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

function realisticPdf(size: number) {
  // A real one-page PDF with a large comment (valid PDF whitespace), accurate
  // object offsets, xref and trailer. No private CV fixture is needed.
  let pdf = "%PDF-1.7\n%" + "synthetic CV ".repeat(Math.ceil(size / 13)) + "\n";
  const offsets = [0];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const content = "BT /F1 12 Tf 72 720 Td (Synthetic event CV) Tj ET\n";
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function main() {
  if (process.env.CONFIRM_NON_PRODUCTION !== "yes")
    throw new Error("Set CONFIRM_NON_PRODUCTION=yes");
  const endpoint = new URL(process.env.S3_ENDPOINT ?? "");
  if (endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1")
    throw new Error("Use disposable loopback MinIO");
  const concurrency = Number(process.env.UPLOAD_CONCURRENCY ?? 8);
  const waves = Number(process.env.UPLOAD_WAVES ?? 4);
  const intervalMs = 4_000;
  if (
    ![concurrency, waves].every(
      (value) => Number.isInteger(value) && value > 0 && value <= 32
    )
  )
    throw new Error("Concurrency and waves must be 1..32");
  const credentials = {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  };
  const client = new S3Client({
    endpoint: endpoint.href,
    forcePathStyle: true,
    region: "us-east-1",
    credentials,
  });
  const prefix = `task03-${randomUUID()}`;
  const buckets = { cv: `${prefix}-cvs`, avatar: `${prefix}-avatars` };
  for (const Bucket of Object.values(buckets))
    await client.send(new CreateBucketCommand({ Bucket }));
  const directory = await mkdtemp(
    resolve("tests/e2e/fixtures/.upload-baseline-")
  );
  const baselinePath = join(directory, "service.ts");
  const ref = process.env.UPLOAD_BASELINE_REF ?? "cc10dd8";
  const source = execFileSync(
    "git",
    ["show", `${ref}:src/application/services/uploadService.ts`],
    { encoding: "utf8" }
  )
    .replaceAll(
      '"./objectStorageService"',
      '"@/application/services/objectStorageService"'
    )
    .replaceAll(
      '"./rateLimitService"',
      '"@/application/services/rateLimitService"'
    );
  await writeFile(baselinePath, source);
  const cv = realisticPdf(10 * 1024 * 1024 - 4096);
  // Deterministic noise produces a decodable near-5-MiB PNG, not magic bytes
  // followed by zeros. Keep its encoder outside the measured app processes.
  const pixels = Buffer.alloc(1310 * 1310 * 3);
  let seed = 12345;
  for (let i = 0; i < pixels.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    pixels[i] = seed >>> 24;
  }
  const avatar = await sharp(pixels, {
    raw: { width: 1310, height: 1310, channels: 3 },
  })
    .png({ compressionLevel: 0 })
    .toBuffer();
  const payloads = { cv, avatar };
  const hash = (bytes: Uint8Array) =>
    createHash("sha256").update(bytes).digest("hex");
  const objects: { kind: "cv" | "avatar"; id: string }[] = [];
  let meter = { puts: 0, bytes: 0, errors: 0, milliseconds: 0 };
  const proxy = createServer((incoming, outgoing) => {
    const started = performance.now();
    let bytes = 0;
    incoming.on("data", (chunk) => {
      bytes += chunk.length;
    });
    const requestTarget = incoming.url ?? "/";
    const parsedTarget = new URL(requestTarget, "http://local-proxy");
    if (parsedTarget.origin !== "http://local-proxy") {
      outgoing.writeHead(400).end();
      return;
    }
    if (parsedTarget.pathname.split("/").includes("..")) {
      outgoing.writeHead(400).end();
      return;
    }
    const safeForwardUrl = new URL(
      `${parsedTarget.pathname}${parsedTarget.search}`,
      endpoint
    );
    const forwarded = httpRequest(
      safeForwardUrl,
      { method: incoming.method, headers: incoming.headers },
      (response) => {
        outgoing.writeHead(response.statusCode!, response.headers);
        response.pipe(outgoing);
        response.on("end", () => {
          if (incoming.method === "PUT") {
            meter.puts++;
            meter.bytes += bytes;
            meter.errors += response.statusCode! >= 300 ? 1 : 0;
            meter.milliseconds += performance.now() - started;
          }
        });
      }
    );
    forwarded.on("error", () => {
      meter.errors++;
      outgoing.writeHead(502).end();
    });
    incoming.pipe(forwarded);
  });
  await new Promise<void>((ready) => proxy.listen(0, "127.0.0.1", ready));
  const children: ReturnType<typeof fork>[] = [];
  const start = async (baseline: boolean) => {
    const child = fork(
      resolve("tests/e2e/fixtures/uploadProcess.ts"),
      baseline ? [baselinePath] : [],
      {
        execArgv: [
          "--expose-gc",
          "--import",
          "tsx",
          "--import",
          pathToFileURL(resolve("tests/e2e/fixtures/serverOnlyLoader.mjs"))
            .href,
        ],
        env: {
          ...process.env,
          NODE_ENV: "test",
          S3_ENDPOINT: `http://127.0.0.1:${(proxy.address() as { port: number }).port}`,
          S3_BUCKET_CVS: buckets.cv,
          S3_BUCKET_AVATARS: buckets.avatar,
          S3_BUCKET_LOGOS: buckets.avatar,
        },
        stdio: ["ignore", "ignore", "inherit", "ipc"],
      }
    );
    children.push(child);
    return new Promise<string>((ready, reject) => {
      child.once("message", (message) =>
        ready(`http://127.0.0.1:${(message as { port: number }).port}`)
      );
      child.once("error", reject);
      child.once("exit", (code) => {
        if (code) reject(new Error(`Host exited ${code}`));
      });
    });
  };
  const post = async (base: string, kind: "cv" | "avatar") => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(payloads[kind])], {
        type: kind === "cv" ? "application/pdf" : "image/png",
      }),
      kind === "cv" ? "cv.pdf" : "avatar.png"
    );
    const started = performance.now();
    const response = await fetch(`${base}/${kind}`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    const result = await response.json();
    if (response.status === 201) objects.push({ kind, id: result.id });
    return { ms: performance.now() - started, status: response.status };
  };
  try {
    const reports = [];
    for (const variant of ["baseline", "changed"]) {
      const base = await start(variant === "baseline");
      await post(base, "cv");
      await post(base, "avatar");
      const idle = await (await fetch(`${base}/reset`)).json();
      meter = { puts: 0, bytes: 0, errors: 0, milliseconds: 0 };
      const results: Awaited<ReturnType<typeof post>>[] = [];
      const started = performance.now();
      for (let wave = 0; wave < waves; wave++) {
        await delay(
          Math.max(0, started + wave * intervalMs - performance.now())
        );
        results.push(
          ...(await Promise.all(
            Array.from({ length: concurrency }, (_, i) =>
              post(base, i % 2 ? "avatar" : "cv")
            )
          ))
        );
      }
      const durationMs = performance.now() - started;
      const metrics = await (await fetch(`${base}/metrics`)).json();
      const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
      reports.push({
        variant,
        concurrency,
        waves,
        requests: results.length,
        offeredWaveIntervalMs: intervalMs,
        durationMs: Math.round(durationMs),
        idleRssMiB: idle.rss / 1024 ** 2,
        peakRssMiB: metrics.peakRss / 1024 ** 2,
        p50ms: latencies[Math.ceil(latencies.length * 0.5) - 1],
        p95ms: latencies[Math.ceil(latencies.length * 0.95) - 1],
        p99ms: latencies[Math.ceil(latencies.length * 0.99) - 1],
        errors: results.filter((r) => r.status !== 201).length,
        minio: {
          ...meter,
          wireMiBPerSecond: meter.bytes / 1024 ** 2 / (durationMs / 1000),
        },
      });
      children.at(-1)!.kill();
    }
    // Independent processes read each other's uploads from the same MinIO.
    const reader = await start(false);
    let crossProcessReads = 0;
    for (const object of [objects[0], objects.at(-1)!]) {
      const key = `distribution/${object.kind}/${object.id}${object.kind === "cv" ? ".pdf" : ""}`;
      const response = await fetch(`${reader}/${encodeURIComponent(key)}`);
      if (
        response.status !== 200 ||
        hash(new Uint8Array(await response.arrayBuffer())) !==
          hash(payloads[object.kind])
      )
        throw new Error("Cross-process storage mismatch");
      crossProcessReads++;
    }
    const output = {
      baselineRef: ref,
      node: process.version,
      platform: process.platform,
      cvBytes: cv.length,
      avatarBytes: avatar.length,
      crossProcessReads,
      reports,
    };
    const evidencePath = process.env.UPLOAD_EVIDENCE_PATH;
    if (evidencePath)
      await writeFile(evidencePath, JSON.stringify(output, null, 2) + "\n");
    console.log(JSON.stringify(output, null, 2));
    if (
      reports.some(
        (report) =>
          report.errors ||
          report.minio.errors ||
          report.minio.puts !== report.requests
      )
    )
      throw new Error("Benchmark upload/storage errors");
    if (
      reports[1].peakRssMiB >= reports[0].peakRssMiB ||
      reports.some((report) => report.p95ms >= intervalMs)
    )
      throw new Error("Local RSS/latency comparison gates failed");
  } finally {
    for (const child of children) child.kill();
    proxy.closeAllConnections();
    proxy.close();
    for (const object of objects)
      await client.send(
        new DeleteObjectCommand({
          Bucket: buckets[object.kind],
          Key: `distribution/${object.kind}/${object.id}${object.kind === "cv" ? ".pdf" : ""}`,
        })
      );
    for (const Bucket of Object.values(buckets))
      await client.send(new DeleteBucketCommand({ Bucket }));
    await rm(directory, { recursive: true, force: true });
    client.destroy();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
