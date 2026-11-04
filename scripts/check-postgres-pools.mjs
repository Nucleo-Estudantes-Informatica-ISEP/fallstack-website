// Run only against a disposable pool_test database; see the connection runbook.
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const filename = fileURLToPath(import.meta.url);

const url = new URL(process.env.POOL_TEST_DATABASE_URL);
assert.equal(process.env.CONFIRM_ISOLATED_POOL_TEST, "yes");
assert.equal(url.pathname, "/pool_test");
// Non-loopback containers require an explicit task-owned hostname opt-in.
const allowedHost = process.env.POOL_TEST_ALLOWED_HOST;
assert.ok(
  [
    "localhost",
    "127.0.0.1",
    "[::1]",
    ...(allowedHost ? [allowedHost] : []),
  ].includes(url.hostname)
);
const prefix = `pool-check-${process.env.POOL_TEST_RUN || process.pid}`;
function client(name, limit) {
  const configured = new URL(url);
  configured.searchParams.set("connection_limit", String(limit));
  configured.searchParams.set("pool_timeout", "5");
  configured.searchParams.set("application_name", `${prefix}-${name}`);
  return new PrismaClient({
    datasourceUrl: configured.href,
    log: [{ emit: "event", level: "query" }],
  });
}

async function child() {
  const limit = Number(process.argv[3]);
  const prisma = client(process.argv[2], limit);
  let durations = [];
  prisma.$on("query", (event) => durations.push(event.duration));
  let work = Promise.resolve();
  process.on("SIGTERM", async () => {
    await work;
    await prisma.$disconnect();
    process.exit(0);
  });
  process.on("message", (phase) => {
    work = (async () => {
      durations = [];
      const started = performance.now();
      const latencies = [];
      const codes = [];
      async function query(seconds) {
        const start = performance.now();
        try {
          await prisma.$queryRawUnsafe(
            "SELECT 1 AS ok FROM pg_sleep($1::double precision)",
            seconds
          );
          codes.push("ok");
        } catch (error) {
          codes.push(error.code || error.name);
        }
        latencies.push(performance.now() - start);
      }
      if (phase === "normal") {
        await Promise.all(Array.from({ length: limit * 8 }, () => query(0.05)));
      } else if (phase === "saturation") {
        await Promise.all(Array.from({ length: limit + 2 }, () => query(6)));
      } else if (phase === "drain") {
        await prisma.$transaction(
          async (tx) => {
            await tx.$executeRawUnsafe(
              "INSERT INTO pool_check_commits VALUES ($1)",
              process.argv[2]
            );
            process.send({ phase: "transaction-started" });
            // Simulates external I/O holding a Wallet transaction, without Google calls.
            await delay(2000);
          },
          { timeout: 60000 }
        );
      }
      process.send({
        phase,
        codes,
        latencies,
        elapsedMs: performance.now() - started,
        queryDurations: durations,
      });
    })().catch(async (error) => {
      process.send({ phase: "failed", code: error.code || error.name });
      await prisma.$disconnect();
      process.exit(1);
    });
  });
  await prisma.$connect();
  process.send({ phase: "ready" });
}

async function parent() {
  const monitor = client("monitor", 1);
  const children = [];
  const samples = [];
  let sampling = true;
  let sampler;
  function message(child, phase) {
    return new Promise((resolve, reject) => {
      const listener = (data) => {
        if (data.phase === "failed") {
          cleanup();
          reject(new Error(data.code));
        } else if (data.phase === phase) {
          cleanup();
          resolve(data);
        }
      };
      const exit = () => {
        cleanup();
        reject(new Error("child exited before " + phase));
      };
      const cleanup = () => {
        child.off("message", listener);
        child.off("exit", exit);
      };
      child.on("message", listener);
      child.on("exit", exit);
    });
  }
  async function start(name, limit) {
    const child = fork(filename, [name, String(limit)], {
      env: { ...process.env, POOL_TEST_RUN: String(process.pid) },
      stdio: ["ignore", "ignore", "inherit", "ipc"],
    });
    children.push(child);
    await message(child, "ready");
    return child;
  }
  async function phase(name) {
    const results = children.map((child) => message(child, name));
    children.forEach((child) => child.send(name));
    return Promise.all(results);
  }
  try {
    await monitor.$executeRawUnsafe(
      "CREATE TABLE pool_check_commits (copy text PRIMARY KEY)"
    );
    sampler = (async () => {
      while (sampling) {
        const rows = await monitor.$queryRawUnsafe(
          "SELECT state, count(*)::int AS count FROM pg_stat_activity WHERE application_name LIKE $1 AND application_name <> $2 GROUP BY state",
          `${prefix}-%`,
          `${prefix}-monitor`
        );
        samples.push(rows);
        await delay(100);
      }
    })();
    await start("web-1", 3);
    await start("web-2", 3);
    await start("cleanup", 1);
    const normal = await phase("normal");
    const saturated = await phase("saturation");
    for (const result of normal)
      assert.ok(result.codes.every((code) => code === "ok"));
    for (const result of saturated)
      assert.equal(result.codes.filter((code) => code === "P2024").length, 2);
    await start("rollout-web", 3);
    const overlap = await phase("normal");
    const txStarted = children.map((child) =>
      message(child, "transaction-started")
    );
    const drained = children.map((child) => message(child, "drain"));
    children.forEach((child) => child.send("drain"));
    await Promise.all(txStarted);
    const exited = children.map((child) => once(child, "exit"));
    children.forEach((child) => child.kill("SIGTERM"));
    await Promise.all(drained);
    for (const [code] of await Promise.all(exited)) assert.equal(code, 0);
    const [commits] = await monitor.$queryRawUnsafe(
      "SELECT count(*)::int AS count FROM pool_check_commits"
    );
    assert.equal(commits.count, 4);
    const [remaining] = await monitor.$queryRawUnsafe(
      "SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name LIKE $1 AND application_name <> $2",
      `${prefix}-%`,
      `${prefix}-monitor`
    );
    assert.equal(remaining.count, 0);
    const latency = normal.flatMap((r) => r.latencies).sort((a, b) => a - b);
    const peak = Math.max(
      ...samples.map((rows) => rows.reduce((sum, row) => sum + row.count, 0))
    );
    assert.ok(peak <= 10);
    console.log(
      JSON.stringify(
        {
          normalQueries: latency.length,
          normalP95Ms: latency[Math.floor(latency.length * 0.95)],
          engineQueryMaxMs: Math.max(
            ...normal.flatMap((r) => r.queryDurations)
          ),
          normalMaxQueueEstimateMs: Math.max(...latency) - 50,
          expectedP2024: saturated
            .flatMap((r) => r.codes)
            .filter((c) => c === "P2024").length,
          overlapQueries: overlap.flatMap((r) => r.codes).length,
          peakConnections: peak,
          peakActive: Math.max(
            ...samples.map(
              (rows) => rows.find((r) => r.state === "active")?.count || 0
            )
          ),
          peakIdle: Math.max(
            ...samples.map(
              (rows) => rows.find((r) => r.state === "idle")?.count || 0
            )
          ),
          idleInTransactionObserved: samples.some((rows) =>
            rows.some((r) => r.state === "idle in transaction")
          ),
          drainedCommits: commits.count,
          remainingConnections: remaining.count,
          samples: samples.length,
          cpu: process.cpuUsage(),
          memory: process.memoryUsage(),
        },
        null,
        2
      )
    );
  } finally {
    sampling = false;
    if (sampler) await sampler;
    const live = children.filter(
      (child) => child.exitCode === null && child.signalCode === null
    );
    const exited = live.map((child) => once(child, "exit"));
    live.forEach((child) => child.kill("SIGTERM"));
    await Promise.all(exited);
    await monitor.$executeRawUnsafe("DROP TABLE IF EXISTS pool_check_commits");
    await monitor.$disconnect();
  }
}
(process.argv[2] ? child() : parent()).catch((error) => {
  console.error("Pool check failed:", error.code || error.message);
  if (process.argv[2]) process.exit(1);
  process.exitCode = 1;
});
