// @vitest-environment node
import { fork, type ChildProcess } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@redis/client";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

import { rateLimitRegistry } from "@/lib/rateLimitMetrics";
import { createRedisRateLimitStore } from "@/application/repositories/redisRateLimitRepository";
import { startRateLimitHealthMonitor } from "@/application/services/rateLimitHealthService";

import { getRedisTestUrl } from "./support/redisTestConfig";

vi.mock("server-only", () => ({}));
const url = getRedisTestUrl();
if (!url)
  console.warn(
    "Distributed limiter tests skipped locally: set TEST_REDIS_URL to disposable loopback Redis."
  );
const processes: ChildProcess[] = [];
const subjects = new Set<string>();
const bases: string[] = [];
let admin: ReturnType<typeof createClient>;
const identity = () => {
  const id = randomUUID();
  subjects.add(id);
  return id;
};
const key = (
  subject: string,
  endpoint = "upload_cv",
  prefix = "fallstack:test:"
) =>
  `${prefix}ratelimit:v1:${endpoint}:${createHash("sha256").update(subject).digest("hex")}`;
beforeAll(async () => {
  if (!url) return;
  admin = createClient({ url, socket: { reconnectStrategy: false } });
  admin.on("error", () => {});
  await admin.connect();
  for (let i = 0; i < 2; i++) {
    const child = fork("tests/e2e/fixtures/rateLimitProcess.ts", [], {
      execArgv: [
        "--import",
        "tsx",
        "--import",
        "./tests/e2e/fixtures/serverOnlyLoader.mjs",
      ],
      env: {
        ...process.env,
        TEST_REDIS_URL: url,
        TEST_REDIS_PREFIX: "fallstack:test:",
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    processes.push(child);
    let diagnostic = "";
    child.stderr?.on("data", (bytes) => {
      diagnostic += bytes.toString();
    });
    child.stdout?.resume();
    const [{ port }] = await Promise.race([
      once(child, "message") as Promise<[{ port: number }]>,
      once(child, "exit").then(() => {
        throw new Error(
          `Limiter fixture exited before listening: ${diagnostic}`
        );
      }),
    ]);
    bases.push(`http://127.0.0.1:${port}`);
  }
});
afterAll(async () => {
  await Promise.all(
    processes.map(async (child) => {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await once(child, "exit");
      }
    })
  );
  if (admin?.isOpen) {
    for (const subject of subjects)
      await admin.del([
        key(subject),
        key(subject, "upload_avatar"),
        key(subject, "upload_cv", "fallstack:local:"),
      ]);
    admin.destroy();
  }
});
const request = (base: string, subject: string, endpoint = "cv") =>
  fetch(`${base}/${endpoint}`, {
    method: "POST",
    headers: { "x-test-subject": subject },
  });

test.skipIf(!url)(
  "both processes time out during a real Redis pause and recover without granting a fresh allowance",
  async () => {
    const subject = identity();
    for (let i = 0; i < 4; i++)
      expect((await request(bases[i % 2], subject)).status).toBe(200);
    await admin.sendCommand(["CLIENT", "PAUSE", "650", "ALL"]);
    const started = performance.now();
    const responses = await Promise.all(
      bases.map((base) => request(base, subject))
    );
    expect(responses.map((response) => response.status)).toEqual([503, 503]);
    expect(performance.now() - started).toBeLessThan(2000);
    // A timed-out EVAL may already have executed. Either zero or one allowance
    // remains; never replay a mutation or grant a new five-request budget.
    let recovered: Response[] = [];
    await vi.waitFor(
      async () => {
        recovered = await Promise.all(
          bases.map((base) => request(base, subject))
        );
        expect(
          recovered.every((response) => [200, 429].includes(response.status))
        ).toBe(true);
      },
      { timeout: 5000, interval: 100 }
    );
    expect(
      recovered.filter((response) => response.status === 200).length
    ).toBeLessThanOrEqual(1);
    expect((await request(bases[0], subject)).status).toBe(429);
  }
);
test.skipIf(!url)(
  "alternating and concurrent processes share exactly five admissions; denials preserve TTL and Retry-After",
  async () => {
    const subject = identity();
    for (let i = 0; i < 3; i++)
      expect((await request(bases[i % 2], subject)).status).toBe(200);
    const responses = await Promise.all(
      Array.from({ length: 30 }, (_, i) => request(bases[i % 2], subject))
    );
    expect(
      responses.filter((response) => response.status === 200)
    ).toHaveLength(2);
    expect(
      responses.filter((response) => response.status === 429)
    ).toHaveLength(28);
    for (const response of responses.filter((item) => item.status === 429)) {
      expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
      expect(Number(response.headers.get("Retry-After"))).toBeLessThanOrEqual(
        60
      );
      expect(await response.json()).toEqual({ error: "Too many requests" });
    }
    expect(await admin.get(key(subject))).toBe("5");
    const ttl = await admin.pTTL(key(subject));
    await request(bases[1], subject);
    expect(await admin.pTTL(key(subject))).toBeLessThanOrEqual(ttl);
    expect((await request(bases[1], identity())).status).toBe(200);
    expect((await request(bases[1], subject, "avatar")).status).toBe(200);
    const otherEnvironment = createRedisRateLimitStore(() => ({
      url: url!,
      prefix: "fallstack:local:",
    }));
    try {
      expect(
        await otherEnvironment.check(
          `upload_cv:${createHash("sha256").update(subject).digest("hex")}`,
          { max: 5, windowMs: 60000 }
        )
      ).toEqual({ status: "allowed" });
    } finally {
      otherEnvironment.close();
    }
  }
);
test.skipIf(!url)(
  "distributed boundary preserves five admissions on both sides and expires inactive keys",
  async () => {
    const subject = identity();
    expect((await request(bases[0], subject)).status).toBe(200);
    // Move only this synthetic key near expiry; server TTL is authoritative.
    await admin.pExpire(key(subject), 1500);
    const before = await Promise.all(
      Array.from({ length: 4 }, (_, i) => request(bases[i % 2], subject))
    );
    expect(before.map((response) => response.status)).toEqual([
      200, 200, 200, 200,
    ]);
    expect((await request(bases[1], subject)).status).toBe(429);
    await delay(1550);
    expect(await admin.exists(key(subject))).toBe(0);
    const after = await Promise.all(
      Array.from({ length: 6 }, (_, i) => request(bases[i % 2], subject))
    );
    expect(after.filter((response) => response.status === 200)).toHaveLength(5);
    expect(after.filter((response) => response.status === 429)).toHaveLength(1);
  }
);
test.skipIf(!url).each(["invalid-value", "missing-ttl", "wrong-type"])(
  "invalid Redis state %s fails closed for that key only, then recovers with the existing budget",
  async (state) => {
    const subject = identity();
    if (state === "wrong-type") await admin.hSet(key(subject), "count", "1");
    else
      await admin.set(
        key(subject),
        state === "invalid-value" ? "invalid-state" : "1",
        state === "invalid-value" ? { PX: 60000 } : undefined
      );
    expect((await request(bases[0], subject)).status).toBe(503);
    expect((await request(bases[0], subject)).status).toBe(503);
    expect((await request(bases[0], identity())).status).toBe(200);
    expect((await request(bases[0], subject, "avatar")).status).toBe(200);
    await admin.set(key(subject), "4", { PX: 60000 });
    expect((await request(bases[0], subject)).status).toBe(200);
    expect((await request(bases[1], subject)).status).toBe(429);
  }
);

test.skipIf(!url)(
  "idle Redis disconnects reconnect without 503 or a global cooldown",
  async () => {
    const subject = identity();
    for (const base of bases)
      expect((await request(base, subject)).status).toBe(200);
    await admin.sendCommand([
      "CLIENT",
      "KILL",
      "TYPE",
      "normal",
      "SKIPME",
      "yes",
    ]);
    // Give the idle clients a turn to receive their TCP close events.
    await delay(50);
    for (const base of bases) {
      expect((await request(base, subject)).status).toBe(200);
      expect((await request(base, identity())).status).toBe(200);
    }
    expect((await request(bases[0], subject)).status).toBe(200);
    expect((await request(bases[1], subject)).status).toBe(429);
  }
);

test.skipIf(!url)(
  "synthetic probes detect Redis outage and recover without any upload attempts",
  async () => {
    const healthKey = `health:${randomUUID()}`;
    const store = createRedisRateLimitStore(() => ({
      url: url!,
      prefix: "fallstack:test:",
    }));
    const stop = startRateLimitHealthMonitor(
      () => store.check(healthKey, { max: 1, windowMs: 1000 }),
      50
    );
    const health = async () =>
      (
        await rateLimitRegistry
          .getSingleMetric("fallstack_rate_limit_degraded")!
          .get()
      ).values[0]?.value;
    try {
      await vi.waitFor(async () => {
        expect(
          await admin.exists(`fallstack:test:ratelimit:v1:${healthKey}`)
        ).toBe(1);
        expect(await health()).toBe(0);
      });
      await admin.sendCommand(["CLIENT", "PAUSE", "650", "ALL"]);
      await vi.waitFor(async () => expect(await health()).toBe(1), {
        timeout: 3000,
      });
      await vi.waitFor(async () => expect(await health()).toBe(0), {
        timeout: 5000,
      });
    } finally {
      stop();
      store.close();
      await admin.del(`fallstack:test:ratelimit:v1:${healthKey}`);
    }
  }
);
