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

/**
 * In-memory rate limiter scoped to a single process.
 *
 * With N application replicas, the effective limit may reach
 * max × N requests per key per window, since each replica maintains
 * an independent counter.
 *
 * This provides traffic shaping, not a hard brute-force protection
 * boundary. Use shared state with atomic updates (e.g. Redis) if
 * cross-replica enforcement is required.
 */
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
     * Checks whether capacity is available without consuming it.
     * The result may become stale if concurrent requests update the bucket.
     */
    peek(key: string): RateLimitResult {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        return { allowed: true, retryAfterMs: 0 };
      }

      if (bucket.count >= max) {
        return {
          allowed: false,
          retryAfterMs: bucket.resetAt - now,
        };
      }

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
      headers: {
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    }
  );
}
