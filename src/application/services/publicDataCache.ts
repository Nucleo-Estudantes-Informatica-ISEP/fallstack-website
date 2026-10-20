import "server-only";

import type { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

export const PUBLIC_DATA_TTL_MS = 60_000;
type Section = "faqs" | "schedule" | "sponsors" | "companies";

export function createPublicDataCache() {
  const entries = new Map<
    string,
    { expiresAt: number; value: Promise<unknown> }
  >();
  return {
    async read<T>(
      section: Section,
      language: Language,
      load: () => Promise<T>
    ): Promise<T> {
      const key = `${branding.year}:${section}:${language}`;
      let entry = entries.get(key);
      if (!entry || entry.expiresAt <= Date.now()) {
        entry = {
          // Pending loads stay shared until they settle.
          expiresAt: Infinity,
          value: Promise.resolve().then(load),
        };
        const pending = entry;
        pending.value = pending.value.then(
          (value) => {
            pending.expiresAt = Date.now() + PUBLIC_DATA_TTL_MS;
            return value;
          },
          (error) => {
            // Share failures briefly to bound retry storms; never serve stale data.
            pending.expiresAt = Date.now() + 1000;
            throw error;
          }
        );
        entries.set(key, entry);
      }
      // Isolate cached DTOs from caller mutation.
      return structuredClone(await entry.value) as T;
    },
    invalidate(section?: Section) {
      for (const key of entries.keys()) {
        if (!section || key.startsWith(`${branding.year}:${section}:`))
          entries.delete(key);
      }
    },
  };
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
