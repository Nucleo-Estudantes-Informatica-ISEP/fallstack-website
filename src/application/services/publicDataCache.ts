import "server-only";

import type { DeepReadonly } from "@/types/DeepReadonly";
import { runtimeNodeEnv } from "@/config/env.server";
import type { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

export const PUBLIC_DATA_TTL_MS = 60_000;
export const PUBLIC_DATA_LOAD_TIMEOUT_MS = 2_000;

// Public DTOs contain only JSON objects, arrays and primitives. Freeze the
// owned snapshot once so readers can share it without copying on every hit.
function freezeDto<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freezeDto(child);
  }
  return value;
}

async function boundedLoad<T>(load: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(load),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Public data load timed out")),
          PUBLIC_DATA_LOAD_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
type Section = "faqs" | "schedule" | "sponsors" | "companies";

export function createPublicDataCache() {
  type Entry = {
    state: "pending" | "ready" | "failed";
    revision: number;
    expiresAt: number;
    value: Promise<unknown>;
    settled: Promise<void>;
  };
  const entries = new Map<string, Entry>();
  const revisions = new Map<string, number>();
  const cache = {
    async read<T>(
      section: Section,
      language: Language,
      load: () => Promise<T>,
      onLoadError?: (error: unknown) => void
    ): Promise<DeepReadonly<T>> {
      const key = `${branding.year}:${section}:${language}`;
      const revision = revisions.get(key) ?? 0;
      let entry = entries.get(key);
      if (
        !entry ||
        (entry.state !== "pending" && entry.expiresAt <= Date.now())
      ) {
        const pending: Entry = {
          state: "pending",
          revision,
          expiresAt: 0,
          value: Promise.resolve(undefined),
          settled: Promise.resolve(),
        };
        const work = Promise.resolve()
          .then(load)
          .then((value) => freezeDto(structuredClone(value)));
        pending.settled = work.then(
          (value) => {
            if (pending.revision !== (revisions.get(key) ?? 0)) {
              pending.state = "failed";
              pending.expiresAt = 0;
              return;
            }
            // A slow success can warm the cache after its first readers timed out.
            pending.state = "ready";
            pending.expiresAt = Date.now() + PUBLIC_DATA_TTL_MS;
            pending.value = Promise.resolve(value);
          },
          () => {
            pending.state = "failed";
            pending.expiresAt =
              pending.revision !== (revisions.get(key) ?? 0)
                ? 0
                : pending.expiresAt || Date.now() + 1000;
          }
        );
        pending.value = boundedLoad(() => work).catch((error) => {
          if (pending.revision === (revisions.get(key) ?? 0))
            pending.expiresAt = Date.now() + 1000;
          onLoadError?.(error);
          throw error;
        });
        entries.set(key, pending);
        entry = pending;
      }
      if (entry.revision !== revision) {
        // shortcut: uncancellable work holds the key; bound the wait and retry after settlement.
        const previous = entry;
        let cancelled = false;
        return (await boundedLoad(async () => {
          await previous.settled;
          if (cancelled) return;
          return cache.read(section, language, load, onLoadError);
        }).finally(() => {
          cancelled = true;
        })) as DeepReadonly<T>;
      }
      return (await entry.value) as DeepReadonly<T>;
    },
    invalidate(section?: Section) {
      for (const [key, entry] of entries) {
        if (!section || key.startsWith(`${branding.year}:${section}:`)) {
          revisions.set(key, (revisions.get(key) ?? 0) + 1);
          if (entry.state !== "pending") entries.delete(key);
        }
      }
    },
  };
  return cache;
}

// Next route bundles share this process cache. No identity or raw DB rows enter it.
// shortcut: other replicas refresh within 60s; use shared invalidation if stricter freshness is needed.
const cacheGlobal = globalThis as typeof globalThis & {
  fallstackPublicDataCacheV1?: ReturnType<typeof createPublicDataCache>;
};
export const publicDataCache =
  runtimeNodeEnv === "development"
    ? createPublicDataCache()
    : (cacheGlobal.fallstackPublicDataCacheV1 ??= createPublicDataCache());

export async function afterPublicDataWrite<T>(
  section: Section,
  write: Promise<T>
): Promise<T> {
  try {
    return await write;
  } finally {
    // A rejected call may still have committed (for example, a lost DB reply).
    publicDataCache.invalidate(section);
  }
}
