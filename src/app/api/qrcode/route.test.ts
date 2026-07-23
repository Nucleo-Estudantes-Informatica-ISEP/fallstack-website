import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
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
  return new NextRequest("http://localhost/api/qrcode", { method: "GET" });
}

test("rejects an unauthenticated request with 401", async () => {
  const getServerSession = (await import("@/application/services/sessionService"))
    .default;
  vi.mocked(getServerSession).mockResolvedValue(null);

  const { GET } = await import("./route");
  const res = await GET(request(), { params: Promise.resolve({}) });

  assert.equal(res.status, 401);
});

test("rejects a non-student session (e.g. an employee) with 403", async () => {
  const getServerSession = (await import("@/application/services/sessionService"))
    .default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "EMPLOYEE",
    isAdmin: false,
    student: null,
    employee: { id: "e1", name: "Rui", companyId: "c1", company: {} },
  } as never);

  const { GET } = await import("./route");
  const res = await GET(request(), { params: Promise.resolve({}) });

  assert.equal(res.status, 403);
});

test("returns a token embedding the student's own code, verifiable with a ~30 minute expiry", async () => {
  const getServerSession = (await import("@/application/services/sessionService"))
    .default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    isAdmin: false,
    student: { id: "s1", code: "S123", name: "Ana" },
    employee: null,
  } as never);

  const { GET } = await import("./route");
  const { verifyJwt } = await import("@/application/services/authService");

  const res = await GET(request(), { params: Promise.resolve({}) });
  assert.equal(res.status, 200);

  const { data } = (await res.json()) as { data: string };
  const decoded = verifyJwt(data) as { code: string; exp: number; iat: number };

  assert.equal(decoded.code, "S123");
  assert.equal(decoded.exp - decoded.iat, 30 * 60);
});
