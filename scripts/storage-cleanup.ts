import "dotenv/config";

import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { disconnectStorageCleanup } from "../src/application/repositories/storageCleanupRepository";
import { runStorageCleanup } from "../src/application/services/storageCleanupService";
import { cleanupMode } from "../src/config/env.storage";

const { values } = parseArgs({
  options: { apply: { type: "boolean" }, daemon: { type: "boolean" } },
});
const apply = values.apply || (values.daemon && cleanupMode() === "apply");
const heartbeat = "/tmp/storage-cleanup-success";
let stopping = false;
const controller = new AbortController();
let timer: NodeJS.Timeout | undefined;
let wake: (() => void) | undefined;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    stopping = true;
    controller.abort();
    if (timer) clearTimeout(timer);
    wake?.();
  });

async function main() {
  do {
    const run = randomUUID();
    // Dedicated worker audit: codes/counts/validated keys only, no raw errors or
    // app logger/Sentry dependency. See docs/storage-cleanup.md for privacy.
    const audit = (event: Record<string, unknown>) =>
      console.log(
        JSON.stringify({ time: new Date().toISOString(), run, ...event })
      );
    try {
      const result = await runStorageCleanup({
        apply: Boolean(apply),
        audit,
        signal: controller.signal,
      });
      audit({ action: "summary", ...result });
      if (values.daemon) {
        await writeFile(heartbeat, JSON.stringify(result));
      } else if (result.failed) process.exitCode = 1;
    } catch (error) {
      audit({
        level: "error",
        action: stopping ? "run-stopped" : "run-failed",
        error: error instanceof Error ? error.name : "UnknownError",
      });
      if (values.daemon) await rm(heartbeat, { force: true });
      else if (!stopping) process.exitCode = 1;
    }
    if (!values.daemon || stopping) break;
    // Initial pass at startup, then daily 03:00 UTC (independent of host TZ).
    const next = new Date();
    next.setUTCHours(3, 0, 0, 0);
    if (next.getTime() <= Date.now()) next.setUTCDate(next.getUTCDate() + 1);
    await new Promise<void>((resolve) => {
      wake = resolve;
      timer = setTimeout(resolve, next.getTime() - Date.now());
    });
  } while (!stopping);
}

main()
  .finally(disconnectStorageCleanup)
  .catch(() => {
    process.exitCode = 1;
  });
