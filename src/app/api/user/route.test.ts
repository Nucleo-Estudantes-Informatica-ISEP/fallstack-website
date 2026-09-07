import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/userService", () => ({
  updateUserInterests: vi.fn(),
}));

beforeAll(() => {
  vi.stubEnv("JWT_SECRET", "test-only-secret-at-least-32-characters-long");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

function request() {
  return new NextRequest("http://localhost/api/user", {
    method: "PATCH",
    body: JSON.stringify({ interests: ["AI"] }),
    headers: { "content-type": "application/json" },
  });
}

test("rejects an admin-only session with 403", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  const { updateUserInterests } =
    await import("@/application/services/userService");

  vi.mocked(getServerSession).mockResolvedValue({
    id: "admin-1",
    role: "ADMIN",
    adminRole: "ADMIN",
    student: null,
    employee: null,
  } as never);

  const { PATCH } = await import("./route");
  const res = await PATCH(request(), { params: Promise.resolve({}) });

  assert.equal(res.status, 403);
  assert.equal(vi.mocked(updateUserInterests).mock.calls.length, 0);
});
