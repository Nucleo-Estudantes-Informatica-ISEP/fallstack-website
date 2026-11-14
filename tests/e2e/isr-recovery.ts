// Opt-in production-server test. Requires a migrated, disposable loopback DB.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(
    process.env.RUN_ISR_RECOVERY,
    "yes",
    "Explicit ISR fault opt-in required"
  );
  assert(["localhost", "127.0.0.1"].includes(url.hostname));
  assert(
    url.pathname.startsWith("/capacity453_"),
    "Use a task-owned capacity453_ database"
  );
  assert.equal(process.env.SHOWCASE_FULL_WEBSITE, "true");
  const db = new PrismaClient();
  const role = `isr_${randomUUID().replaceAll("-", "")}`;
  const id = randomUUID();
  const marker = `ISR-${id}`;
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = (listener.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve()))
  );
  let log = "";
  let server: ReturnType<typeof spawn> | undefined;
  async function until<T>(
    read: () => Promise<T>,
    accepts: (value: T) => boolean,
    timeout = 90_000
  ) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = await read();
      if (accepts(value)) return value;
      await delay(1000);
    }
    throw new Error(
      `ISR condition timed out. Server tail: ${log.slice(-4000)}`
    );
  }
  async function page(language: string) {
    const response = await fetch(`http://127.0.0.1:${port}/event/${language}`, {
      signal: AbortSignal.timeout(15_000),
    });
    return {
      status: response.status,
      cache: response.headers.get("x-nextjs-cache"),
      html: await response.text(),
    };
  }
  try {
    await db.$executeRawUnsafe(`CREATE ROLE "${role}" LOGIN`);
    await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    await db.$executeRawUnsafe(
      `GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${role}"`
    );
    const last = await db.faqEntry.aggregate({ _max: { order: true } });
    await db.faqEntry.create({
      data: {
        id,
        order: (last._max.order ?? 0) + 1,
        question: { PT: `${marker}-A`, EN: `${marker}-A` },
        answer: { PT: "Teste ISR", EN: "ISR test" },
      },
    });
    const appUrl = new URL(url);
    appUrl.username = role;
    appUrl.password = "";
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "-H",
        "127.0.0.1",
        "-p",
        String(port),
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: "production",
          DATABASE_URL: appUrl.href,
          DIRECT_URL: appUrl.href,
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    for (const stream of [server.stdout!, server.stderr!])
      stream.on("data", (data: Buffer) => {
        log = (log + data.toString()).slice(-100_000);
      });
    await until(
      async () => log,
      (value) => value.includes("Ready")
    );
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    const upload = await fetch(`http://127.0.0.1:${port}/api/storage/cv`, {
      method: "POST",
    });
    assert.equal(upload.status, 401);
    assert.match(health.headers.get("x-instance-id") ?? "", /^[0-9a-f]{8}$/);
    assert.equal(
      upload.headers.get("x-instance-id"),
      health.headers.get("x-instance-id"),
      "Middleware and streaming routes must identify the same process"
    );
    const warm = await page("pt");
    assert.equal(warm.status, 200);
    assert(warm.html.includes(`${marker}-A`));
    const hit = await page("pt");
    assert.equal(hit.cache, "HIT");
    await db.$executeRawUnsafe(`REVOKE SELECT ON "FaqEntry" FROM "${role}"`);
    await db.faqEntry.update({
      where: { id },
      data: { question: { PT: `${marker}-B`, EN: `${marker}-B` } },
    });
    console.log(
      JSON.stringify({ phase: "warm", status: warm.status, cache: hit.cache })
    );
    // Both the 60-second DTO TTL and the production ISR TTL must actually expire.
    await delay(62_000);
    const stale = await page("pt");
    assert.equal(stale.status, 200);
    assert.equal(stale.cache, "STALE");
    assert(stale.html.includes(`${marker}-A`));
    await until(
      async () => log,
      (value) => value.includes('"operation":"homepage_faqs"')
    );
    const retained = await page("pt");
    assert.equal(retained.status, 200);
    assert(retained.html.includes(`${marker}-A`));
    const cold = await page("en");
    assert.equal(cold.status, 500);
    assert(!cold.html.includes(`${marker}-B`));
    console.log(
      JSON.stringify({
        phase: "database-read-fault",
        stale: stale.status,
        retained: retained.status,
        cold: cold.status,
      })
    );
    await db.$executeRawUnsafe(`GRANT SELECT ON "FaqEntry" TO "${role}"`);
    const recoveredCold = await until(
      () => page("en"),
      (value) => value.status === 200 && value.html.includes(`${marker}-B`)
    );
    const recoveredWarm = await until(
      () => page("pt"),
      (value) => value.status === 200 && value.html.includes(`${marker}-B`)
    );
    console.log(
      JSON.stringify({
        phase: "recovery",
        warm: recoveredWarm.status,
        cold: recoveredCold.status,
        updatedContent: true,
      })
    );
  } finally {
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await once(server, "exit");
    }
    await db.faqEntry.deleteMany({ where: { id } });
    await db.$executeRawUnsafe(`DROP OWNED BY "${role}"`);
    await db.$executeRawUnsafe(`DROP ROLE "${role}"`);
    await db.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
