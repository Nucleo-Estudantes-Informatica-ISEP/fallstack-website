import "server-only";

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
  const entries = new Map<
    string,
    {
      expiresAt: number;
      value: Promise<unknown>;
      loading: boolean;
      invalidated: boolean;
    }
  >();
  const cache = {
    async read<T>(
      section: Section,
      language: Language,
      load: () => Promise<T>,
      onLoadError?: (error: unknown) => void
    ): Promise<T> {
      const key = `${branding.year}:${section}:${language}`;
      let entry = entries.get(key);
      if (!entry || (!entry.loading && entry.expiresAt <= Date.now())) {
        entry = {
          // Pending loads share a bounded promise, including its timeout.
          expiresAt: Infinity,
          value: Promise.resolve(undefined),
          loading: true,
          invalidated: false,
        };
        const pending = entry;
        // Track the actual work, which can outlive the response deadline.
        // Invalidation must retain this guard until the underlying load settles.
        pending.value = boundedLoad(async () => {
          try {
            // Detach from references retained by the loader before freezing.
            return freezeDto(structuredClone(await load()));
          } finally {
            pending.loading = false;
          }
        }).then(
          (value) => {
            pending.expiresAt = pending.invalidated
              ? 0
              : Date.now() + PUBLIC_DATA_TTL_MS;
            return value;
          },
          (error) => {
            // Share failures briefly to bound retry storms; never serve stale data.
            pending.expiresAt = Date.now() + 1000;
            onLoadError?.(error);
            throw error;
          }
        );
        entries.set(key, entry);
      }
      // The shared DTO snapshot is deeply frozen; callers must not mutate it.
      const invalidated = entry.invalidated;
      const value = await entry.value;
      // A write during a load requires a fresh read after that work settles.
      if (invalidated) return cache.read(section, language, load, onLoadError);
      return value as T;
    },
    invalidate(section?: Section) {
      for (const [key, entry] of entries) {
        if (!section || key.startsWith(`${branding.year}:${section}:`)) {
          if (entry.loading) {
            entry.invalidated = true;
            entry.expiresAt = 0;
          } else entries.delete(key);
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
export const publicDataCache = (cacheGlobal.fallstackPublicDataCacheV1 ??=
  createPublicDataCache());

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
