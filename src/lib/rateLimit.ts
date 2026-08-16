import { NextResponse } from "next/server";

// Single-server, in-memory fixed-window limiter. A key can use the full budget
// on both sides of a window boundary, so this is traffic shaping rather than a
// hard security boundary. It is intentionally keyed by authenticated user ID.
// Revisit with a shared token-bucket store if the app gains multiple replicas
// or staging load tests show that the boundary burst is material (see #287).
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

/** Standard 429 response for a rate-limited request. */
export function tooManyRequestsResponse(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
    }
  );
}
