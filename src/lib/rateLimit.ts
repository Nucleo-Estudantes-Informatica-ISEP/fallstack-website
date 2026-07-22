import { NextRequest } from "next/server";

// Single-server, in-memory fixed-window limiter - no shared store, so this
// only limits per app instance. Fine while the app runs on one server
// (see #213); revisit with a shared store (e.g. Redis) if that changes.
type Bucket = { count: number; resetAt: number };

export function createRateLimiter({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}) {
  const buckets = new Map<string, Bucket>();

  // Sweep expired buckets periodically so long-running processes don't
  // accumulate one entry per distinct key (IP) forever.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets)
      if (bucket.resetAt <= now) buckets.delete(key);
  }, windowMs);
  sweep.unref?.();

  return {
    /** Returns whether `key` is still within its request budget for the current window. */
    check(key: string): { allowed: boolean; retryAfterMs: number } {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterMs: 0 };
      }

      if (bucket.count >= max)
        return { allowed: false, retryAfterMs: bucket.resetAt - now };

      bucket.count += 1;
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}

/** Best-effort client IP from proxy headers, for rate-limiting keys only - not an auth signal. */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
