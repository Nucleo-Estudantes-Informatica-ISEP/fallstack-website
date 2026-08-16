import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/scheduleService", () => ({
  updateScheduleEventForAdmin: vi.fn(),
  deleteScheduleEventForAdmin: vi.fn(),
}));

beforeAll(() => {
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

const adminSession = {
  id: "u1",
  role: "EMPLOYEE",
  adminRole: "ADMIN",
  student: null,
  employee: null,
};

const nonAdminSession = {
  id: "u2",
  role: "STUDENT",
  adminRole: null,
  student: { id: "s1", code: "S123", name: "Ana" },
  employee: null,
};

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/schedule/a", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new NextRequest("http://localhost/api/admin/schedule/a", {
    method: "DELETE",
  });
}

test("PATCH rejects a non-admin session with 403", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(nonAdminSession as never);

  const { PATCH } = await import("./route");
  const res = await PATCH(patchRequest({ activity: "Renamed" }), {
    params: Promise.resolve({ id: "a" }),
  });

  assert.equal(res.status, 403);
});

test("PATCH rejects an empty body with 400", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { updateScheduleEventForAdmin } =
    await import("@/application/services/scheduleService");

  const { PATCH } = await import("./route");
  const res = await PATCH(patchRequest({}), {
    params: Promise.resolve({ id: "a" }),
  });

  assert.equal(res.status, 400);
  assert.equal(vi.mocked(updateScheduleEventForAdmin).mock.calls.length, 0);
});

test("PATCH updates the event for an admin request", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { updateScheduleEventForAdmin } =
    await import("@/application/services/scheduleService");
  vi.mocked(updateScheduleEventForAdmin).mockResolvedValue({
    id: "a",
    day: 1,
    order: 0,
    startTime: "09:00",
    endTime: "10:00",
    activity: "Renamed",
  } as never);

  const { PATCH } = await import("./route");
  const res = await PATCH(patchRequest({ activity: "Renamed" }), {
    params: Promise.resolve({ id: "a" }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.activity, "Renamed");
  assert.equal(vi.mocked(updateScheduleEventForAdmin).mock.calls[0]?.[0], "a");
});

test("DELETE rejects a non-admin session with 403", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(nonAdminSession as never);

  const { DELETE } = await import("./route");
  const res = await DELETE(deleteRequest(), {
    params: Promise.resolve({ id: "a" }),
  });

  assert.equal(res.status, 403);
});

test("DELETE removes the event and returns 204 for an admin request", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { deleteScheduleEventForAdmin } =
    await import("@/application/services/scheduleService");
  vi.mocked(deleteScheduleEventForAdmin).mockResolvedValue(undefined);

  const { DELETE } = await import("./route");
  const res = await DELETE(deleteRequest(), {
    params: Promise.resolve({ id: "a" }),
  });

  assert.equal(res.status, 204);
  assert.equal(vi.mocked(deleteScheduleEventForAdmin).mock.calls[0]?.[0], "a");
});
