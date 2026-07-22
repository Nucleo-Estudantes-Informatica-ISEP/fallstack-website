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

/**
 * Best-effort client IP from proxy headers, for rate-limiting keys only - not
 * an auth signal.
 *
 * Reverse proxies (nginx, Traefik/Coolify) append the real client IP as the
 * right-most hop of X-Forwarded-For rather than overwrite the header, since a
 * client can put anything it wants in the header on the original request.
 * Trusting the left-most entry would let a client defeat rate limiting by
 * sending a fresh, arbitrary X-Forwarded-For on every request, so this reads
 * the right-most hop instead - the one the trusted proxy appended. This
 * assumes the deployment sits behind exactly one such proxy; an extra hop
 * (e.g. a CDN in front of it) would require trusting the second-to-last
 * entry instead.
 */
export function getClientIp(req: { headers: Pick<Headers, "get"> }): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
