import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/actionService", () => ({
  getActionQrCode: vi.fn(),
  completeActionById: vi.fn(),
  toggleActionLive: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
});

function request(method: string) {
  return new NextRequest("http://localhost/api/actions/x", { method });
}

test("GET returns 404 when the action doesn't exist", async () => {
  const { getActionQrCode } =
    await import("@/application/services/actionService");
  vi.mocked(getActionQrCode).mockResolvedValue(null);

  const { GET } = await import("./route");
  const res = await GET(request("GET"), {
    params: Promise.resolve({ id: "missing" }),
  });

  assert.equal(res.status, 404);
});

test("GET returns the action and its live QR token for a real action", async () => {
  const { getActionQrCode } =
    await import("@/application/services/actionService");
  vi.mocked(getActionQrCode).mockResolvedValue({
    action: {
      id: "action-1",
      name: "Booth",
      description: "Visit the booth",
      points: 10,
      altText: null,
      isLive: true,
      isVisible: true,
    },
    qrCode: "action-signed-token",
  } as never);

  const { GET } = await import("./route");
  const res = await GET(request("GET"), {
    params: Promise.resolve({ id: "action-1" }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.qrCode, "action-signed-token");
  assert.equal(body.action.id, "action-1");
});

test("POST rejects an unauthenticated request with 401", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(null);

  const { POST } = await import("./route");
  const res = await POST(request("POST"), {
    params: Promise.resolve({ id: "whatever" }),
  });

  assert.equal(res.status, 401);
});

test("POST rejects a malformed/tampered scanned token with 400, without completing the action", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    adminRole: null,
    student: { id: "s1", code: "S123", name: "Ana" },
    employee: null,
  } as never);

  const { POST } = await import("./route");
  const { completeActionById } =
    await import("@/application/services/actionService");
  const res = await POST(request("POST"), {
    params: Promise.resolve({ id: "not-a-real-jwt" }),
  });

  assert.equal(res.status, 400);
  assert.equal(vi.mocked(completeActionById).mock.calls.length, 0);
});

test("POST completes the action for a validly-scanned, unexpired token", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    adminRole: null,
    student: { id: "s1", code: "S123", name: "Ana" },
    employee: null,
  } as never);

  const { signJwt } = await import("@/application/services/authService");
  const token = signJwt(
    { id: "action-1", timestamp: Date.now() },
    { algorithm: "HS256", expiresIn: 30 }
  );

  const { POST } = await import("./route");
  const { completeActionById } =
    await import("@/application/services/actionService");
  const res = await POST(request("POST"), {
    params: Promise.resolve({ id: token }),
  });

  assert.equal(res.status, 200);
  assert.equal(vi.mocked(completeActionById).mock.calls[0]?.[0], "s1");
  assert.equal(vi.mocked(completeActionById).mock.calls[0]?.[1], "action-1");
});

test("POST rejects a scanned token once it's past its 30s expiry (the #212 regression case)", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    adminRole: null,
    student: { id: "s1", code: "S123", name: "Ana" },
    employee: null,
  } as never);

  vi.useFakeTimers();
  try {
    const { signJwt } = await import("@/application/services/authService");
    const token = signJwt(
      { id: "action-1", timestamp: Date.now() },
      { algorithm: "HS256", expiresIn: 30 }
    );

    vi.advanceTimersByTime(31_000);

    const { POST } = await import("./route");
    const { completeActionById } =
      await import("@/application/services/actionService");
    const res = await POST(request("POST"), {
      params: Promise.resolve({ id: token }),
    });

    assert.equal(res.status, 400);
    assert.equal(vi.mocked(completeActionById).mock.calls.length, 0);
  } finally {
    vi.useRealTimers();
  }
});

test("POST rejects a signed token from a previous QR refresh window", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    adminRole: null,
    student: { id: "s1", code: "S123", name: "Ana" },
    employee: null,
  } as never);

  const { signJwt } = await import("@/application/services/authService");
  const token = signJwt(
    { id: "action-1", timestamp: Date.now() - 31_000 },
    { algorithm: "HS256", expiresIn: 60 }
  );

  const { POST } = await import("./route");
  const { completeActionById } =
    await import("@/application/services/actionService");
  const res = await POST(request("POST"), {
    params: Promise.resolve({ id: token }),
  });

  assert.equal(res.status, 400);
  assert.equal(vi.mocked(completeActionById).mock.calls.length, 0);
});

test("PATCH rejects a non-admin session with 403", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "STUDENT",
    adminRole: null,
    student: { id: "s1", code: "S123", name: "Ana" },
    employee: null,
  } as never);

  const { PATCH } = await import("./route");
  const res = await PATCH(request("PATCH"), {
    params: Promise.resolve({ id: "action-1" }),
  });

  assert.equal(res.status, 403);
});

test("PATCH toggles the action live status for an admin", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "EMPLOYEE",
    adminRole: "ADMIN",
    student: null,
    employee: null,
  } as never);

  const { PATCH } = await import("./route");
  const { toggleActionLive } =
    await import("@/application/services/actionService");
  const res = await PATCH(request("PATCH"), {
    params: Promise.resolve({ id: "action-1" }),
  });

  assert.equal(res.status, 200);
  assert.equal(vi.mocked(toggleActionLive).mock.calls[0]?.[0], "action-1");
});
