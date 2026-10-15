import { NextResponse } from "next/server";

// Single-server, in-memory fixed-window limiter. A key can use the full budget
// on both sides of a window boundary, so this is traffic shaping rather than a
// hard security boundary. It is intentionally keyed by authenticated user ID.
// Revisit with a shared token-bucket store if the app gains multiple replicas
// or staging load tests show that the boundary burst is material (see #287).
type Bucket = { count: number; resetAt: number };

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

type ReservationResult = RateLimitResult & {
  release: () => void;
};

export function createRateLimiter({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}) {
  const buckets = new Map<string, Bucket>();

  // Sweep expired buckets periodically so long-running processes don't
  // accumulate one entry per distinct key forever.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets)
      if (bucket.resetAt <= now) buckets.delete(key);
  }, windowMs);
  sweep.unref?.();

  function increment(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterMs: 0 };
    }

    if (bucket.count >= max) {
      return {
        allowed: false,
        retryAfterMs: bucket.resetAt - now,
      };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  return {
    /** Counts every accepted request against the current window. */
    check(key: string): RateLimitResult {
      return increment(key);
    },

    /**
     * Reserves capacity immediately. Call release() if the operation should
     * not count against the limit. The reservation is counted otherwise.
     */
    reserve(key: string): ReservationResult {
      const result = increment(key);

      if (!result.allowed) {
        return { ...result, release: () => {} };
      }

      const bucket = buckets.get(key);
      let released = false;

      return {
        ...result,
        release: () => {
          if (released) return;
          released = true;

          // Do not decrement a replacement bucket after the window expires.
          if (bucket && buckets.get(key) === bucket) {
            bucket.count = Math.max(0, bucket.count - 1);
          }
        },
      };
    },
  };
}

/** Standard 429 response for a rate-limited request. */
export function tooManyRequestsResponse(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    }
  );
}
