import { afterAll, beforeAll, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

// serverEnv (src/config/env.server.ts) validates lazily against real
// process.env on first property access - nothing else in this repo
// exercises the real signJwt/verifyJwt (every consumer mocks
// authService away), so this is the first test to need a real secret in
// place. Scoped to this file only via vi.stubEnv/unstubAllEnvs so it can't
// leak into other test files sharing the same worker.
beforeAll(() => {
  vi.stubEnv("JWT_SECRET", "test-only-secret-at-least-32-characters-long");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

test("verifyJwt decodes a token signed by signJwt with the same payload", async () => {
  const { signJwt, verifyJwt } = await import("./authService");

  const token = signJwt({ code: "S123" }, { expiresIn: 60 });
  const decoded = verifyJwt(token) as { code: string };

  expect(decoded.code).toBe("S123");
});

test("verifyJwt returns null for a garbage token instead of throwing", async () => {
  const { verifyJwt } = await import("./authService");

  expect(verifyJwt("not-a-real-jwt")).toBeNull();
});

test("verifyJwt returns null for a token signed with a different secret", async () => {
  const jwt = await import("jsonwebtoken");
  const { verifyJwt } = await import("./authService");

  const foreignToken = jwt.sign({ code: "S123" }, "a-completely-different-secret");

  expect(verifyJwt(foreignToken)).toBeNull();
});

test("verifyJwt rejects an expired token", async () => {
  vi.useFakeTimers();
  try {
    const { signJwt, verifyJwt } = await import("./authService");

    const token = signJwt({ id: "action-1" }, { expiresIn: 30 });
    expect(verifyJwt(token)).not.toBeNull();

    vi.advanceTimersByTime(31_000);

    expect(verifyJwt(token)).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
