import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/faqService", () => ({
  updateFaqOrder: vi.fn(),
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
  return new NextRequest("http://localhost/api/admin/faqs/order", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("PATCH rejects a non-admin session with 403", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(nonAdminSession as never);

  const { PATCH } = await import("./route");
  const res = await PATCH(patchRequest({ updates: [] }), {
    params: Promise.resolve({}),
  });

  assert.equal(res.status, 403);
});

test("PATCH rejects a malformed body with 400, without persisting anything", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { updateFaqOrder } = await import("@/application/services/faqService");

  const { PATCH } = await import("./route");
  const res = await PATCH(
    patchRequest({ updates: [{ id: "not-a-uuid", order: 0 }] }),
    { params: Promise.resolve({}) }
  );

  assert.equal(res.status, 400);
  assert.equal(vi.mocked(updateFaqOrder).mock.calls.length, 0);
});

test("PATCH commits the reorder for a valid admin request", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { updateFaqOrder } = await import("@/application/services/faqService");
  vi.mocked(updateFaqOrder).mockResolvedValue(undefined);

  const updates = [{ id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", order: 0 }];

  const { PATCH } = await import("./route");
  const res = await PATCH(patchRequest({ updates }), {
    params: Promise.resolve({}),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.message, "FAQ order updated");
  assert.deepEqual(vi.mocked(updateFaqOrder).mock.calls[0]?.[0], updates);
});
