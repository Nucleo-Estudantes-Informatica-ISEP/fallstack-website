import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/sessionCheckInService", () => ({
  recordSessionCheckIn: vi.fn(),
}));

function request(body: unknown) {
  return new NextRequest("http://localhost/api/sessions/session-1/check-ins", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("rejects students and company employees and allows NEI members", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  const { recordSessionCheckIn } =
    await import("@/application/services/sessionCheckInService");

  vi.mocked(getServerSession).mockResolvedValue({
    id: "student-user",
    role: "STUDENT",
    adminRole: null,
    student: { id: "student-1" },
    employee: null,
  } as never);
  const { POST } = await import("./route");
  assert.equal(
    (
      await POST(request({ code: "AB12" }), {
        params: Promise.resolve({ sessionId: "session-1" }),
      })
    ).status,
    403
  );

  vi.mocked(getServerSession).mockResolvedValue({
    id: "staff-user",
    role: "EMPLOYEE",
    adminRole: null,
    student: null,
    employee: { company: { id: "company-1" } },
  } as never);
  assert.equal(
    (
      await POST(request({ code: "AB12" }), {
        params: Promise.resolve({ sessionId: "session-1" }),
      })
    ).status,
    403
  );
  vi.mocked(getServerSession).mockResolvedValue({
    id: "staff-user",
    role: null,
    adminRole: null,
    neiMember: true,
    student: null,
    employee: null,
  } as never);
  vi.mocked(recordSessionCheckIn).mockResolvedValue({
    id: "check-in-1",
  } as never);
  const response = await POST(request({ typedCode: "AB12" }), {
    params: Promise.resolve({ sessionId: "session-1" }),
  });

  assert.equal(response.status, 201);
  assert.equal(
    vi.mocked(recordSessionCheckIn).mock.calls[0]?.[1],
    "staff-user"
  );
});

test("allows admins, including admin-only accounts", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "admin-user",
    role: null,
    adminRole: "ADMIN",
    student: null,
    employee: null,
  } as never);
  const { POST } = await import("./route");
  const { recordSessionCheckIn } =
    await import("@/application/services/sessionCheckInService");
  vi.mocked(recordSessionCheckIn).mockResolvedValue({
    id: "check-in-1",
  } as never);

  const response = await POST(request({ permanentCode: "AB12" }), {
    params: Promise.resolve({ sessionId: "session-1" }),
  });
  assert.equal(response.status, 201);
});

test("returns schema errors for multiple credentials", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "staff-user",
    role: "EMPLOYEE",
    adminRole: null,
    neiMember: true,
    student: null,
    employee: { company: { id: "company-1" } },
  } as never);
  const { POST } = await import("./route");

  const response = await POST(request({ token: "token", typedCode: "AB12" }), {
    params: Promise.resolve({ sessionId: "session-1" }),
  });
  assert.equal(response.status, 400);
});
