import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { beforeEach, test, vi } from "vitest";

import { HttpError } from "@/types/HttpError";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/sessionCheckInService", () => ({
  getSessionCheckInCount: vi.fn(),
}));
vi.mock("@/application/services/rateLimitService", () => ({
  checkRateLimit: vi.fn(async () => ({ status: "allowed" })),
}));

const context = { params: Promise.resolve({ sessionId: "session-1" }) };
const request = () =>
  new NextRequest("http://localhost/api/sessions/session-1/check-ins/count");

async function mocks() {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  const { getSessionCheckInCount } =
    await import("@/application/services/sessionCheckInService");
  const { checkRateLimit } =
    await import("@/application/services/rateLimitService");
  const { GET } = await import("./route");
  return { getServerSession, getSessionCheckInCount, checkRateLimit, GET };
}

beforeEach(() => {
  vi.clearAllMocks();
});

test.each([
  [
    "student",
    {
      id: "u",
      role: "STUDENT",
      adminRole: null,
      student: { id: "s" },
      employee: null,
    },
    403,
  ],
  [
    "employee",
    {
      id: "u",
      role: "EMPLOYEE",
      adminRole: null,
      student: null,
      employee: { company: { id: "c" } },
    },
    403,
  ],
  [
    "NEI member past the attendance bound",
    {
      id: "u",
      role: null,
      adminRole: null,
      neiMember: true,
      attendanceExpiresAt: 0,
      student: null,
      employee: null,
    },
    403,
  ],
  ["anonymous visitor", null, 401],
])("denies a %s", async (_label, session, status) => {
  const { getServerSession, getSessionCheckInCount, GET } = await mocks();
  vi.mocked(getServerSession).mockResolvedValue(session as never);
  assert.equal((await GET(request(), context)).status, status);
  assert.equal(vi.mocked(getSessionCheckInCount).mock.calls.length, 0);
});

test.each([
  ["NEI member", { adminRole: null, neiMember: true }],
  ["admin", { adminRole: "ADMIN" }],
])("returns the count for an %s", async (_label, roles) => {
  const { getServerSession, getSessionCheckInCount, GET } = await mocks();
  vi.mocked(getServerSession).mockResolvedValue({
    id: "staff",
    role: null,
    student: null,
    employee: null,
    attendanceExpiresAt: Date.now() + 300000,
    ...roles,
  } as never);
  vi.mocked(getSessionCheckInCount).mockResolvedValue(7);
  const response = await GET(request(), context);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { count: 7 });
  assert.deepEqual(vi.mocked(getSessionCheckInCount).mock.calls, [
    ["session-1"],
  ]);
});

test("propagates 404 for an unknown session", async () => {
  const { getServerSession, getSessionCheckInCount, GET } = await mocks();
  vi.mocked(getServerSession).mockResolvedValue({
    id: "staff",
    role: null,
    adminRole: "ADMIN",
    attendanceExpiresAt: Date.now() + 300000,
    student: null,
    employee: null,
  } as never);
  vi.mocked(getSessionCheckInCount).mockRejectedValue(
    new HttpError("Session not found.", 404)
  );
  const response = await GET(request(), context);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Session not found." });
});

test("does not consume the check-in rate limit", async () => {
  const { getServerSession, getSessionCheckInCount, checkRateLimit, GET } =
    await mocks();
  vi.mocked(getServerSession).mockResolvedValue({
    id: "staff",
    role: null,
    adminRole: "ADMIN",
    attendanceExpiresAt: Date.now() + 300000,
    student: null,
    employee: null,
  } as never);
  vi.mocked(getSessionCheckInCount).mockResolvedValue(1);
  await GET(request(), context);
  assert.equal(vi.mocked(checkRateLimit).mock.calls.length, 0);
});
