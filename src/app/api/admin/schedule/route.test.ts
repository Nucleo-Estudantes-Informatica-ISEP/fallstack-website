import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/scheduleService", () => ({
  listScheduleEventsForAdmin: vi.fn(),
  createScheduleEventForAdmin: vi.fn(),
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
  isAdmin: true,
  student: null,
  employee: null,
};

const nonAdminSession = {
  id: "u2",
  role: "STUDENT",
  isAdmin: false,
  student: { id: "s1", code: "S123", name: "Ana" },
  employee: null,
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("GET rejects a non-admin session with 403", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(nonAdminSession as never);

  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest("http://localhost/api/admin/schedule"),
    { params: Promise.resolve({}) }
  );

  assert.equal(res.status, 403);
});

test("GET returns the paginated list for an admin", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { listScheduleEventsForAdmin } =
    await import("@/application/services/scheduleService");
  vi.mocked(listScheduleEventsForAdmin).mockResolvedValue({
    items: [
      {
        id: "a",
        day: 1,
        order: 0,
        startTime: "09:00",
        endTime: "10:00",
        activity: "Opening",
      },
    ],
    totalCount: 1,
  } as never);

  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest("http://localhost/api/admin/schedule"),
    { params: Promise.resolve({}) }
  );
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.totalCount, 1);
  assert.equal(body.items[0].activity, "Opening");
});

test("POST rejects a malformed body with 400, without creating anything", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { createScheduleEventForAdmin } =
    await import("@/application/services/scheduleService");

  const { POST } = await import("./route");
  const res = await POST(postRequest({ day: 3, startTime: "09:00" }), {
    params: Promise.resolve({}),
  });

  assert.equal(res.status, 400);
  assert.equal(vi.mocked(createScheduleEventForAdmin).mock.calls.length, 0);
});

test("POST creates the event and returns 201 for a valid admin request", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { createScheduleEventForAdmin } =
    await import("@/application/services/scheduleService");
  vi.mocked(createScheduleEventForAdmin).mockResolvedValue({
    id: "a",
    day: 1,
    order: 0,
    startTime: "09:00",
    endTime: "10:00",
    activity: "Opening",
  } as never);

  const { POST } = await import("./route");
  const res = await POST(
    postRequest({
      day: 1,
      startTime: "09:00",
      endTime: "10:00",
      activity: "Opening",
    }),
    { params: Promise.resolve({}) }
  );
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.id, "a");
  assert.equal(
    vi.mocked(createScheduleEventForAdmin).mock.calls[0]?.[0].activity,
    "Opening"
  );
});
