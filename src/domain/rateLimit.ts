export type RateLimitPolicy = { windowMs: number; max: number };
export type RateLimitDecision =
  | { status: "allowed" }
  | { status: "limited"; retryAfterMs: number }
  | { status: "unavailable" };

// The application depends on this small port, never on a Redis client.
export interface RateLimitStore {
  check(
    key: string,
    policy: RateLimitPolicy
  ): Promise<Exclude<RateLimitDecision, { status: "unavailable" }>>;
}
