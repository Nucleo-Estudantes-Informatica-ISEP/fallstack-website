import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/savedStudentService", () => ({
  getStudentStats: vi.fn(),
}));

function request() {
  return new NextRequest("http://localhost/api/students/S123/stats", {
    method: "GET",
  });
}

test("rejects an unauthenticated request with 401", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(null);

  const { GET } = await import("./route");
  const res = await GET(request(), {
    params: Promise.resolve({ code: "S123" }),
  });

  assert.equal(res.status, 401);
});

test("passes the caller's ownership info through to getStudentStats and returns its result", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u1",
    role: "EMPLOYEE",
    isAdmin: false,
    student: null,
    employee: { id: "e1", name: "Rui", companyId: "c1", company: { id: "c1" } },
  } as never);

  const { getStudentStats } =
    await import("@/application/services/savedStudentService");
  vi.mocked(getStudentStats).mockResolvedValue({
    totalScans: 5,
    totalSaves: 2,
  });

  const { GET } = await import("./route");
  const res = await GET(request(), {
    params: Promise.resolve({ code: "S123" }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body, { totalScans: 5, totalSaves: 2 });
  assert.equal(vi.mocked(getStudentStats).mock.calls[0]?.[0], "S123");
  const access = vi.mocked(getStudentStats).mock.calls[0]?.[1];
  assert.equal(access?.companyId, "c1");
  assert.equal(access?.isAdmin, false);
});

test("propagates getStudentStats' 404 for an unauthorized caller", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue({
    id: "u2",
    role: "STUDENT",
    isAdmin: false,
    student: { id: "s2", code: "S999", name: "Bea" },
    employee: null,
  } as never);

  const { getStudentStats } =
    await import("@/application/services/savedStudentService");
  const { HttpError } = await import("@/types/HttpError");
  vi.mocked(getStudentStats).mockRejectedValue(new HttpError("Not found", 404));

  const { GET } = await import("./route");
  const res = await GET(request(), {
    params: Promise.resolve({ code: "S123" }),
  });

  assert.equal(res.status, 404);
});
