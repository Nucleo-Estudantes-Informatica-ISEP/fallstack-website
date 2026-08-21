import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/faqService", () => ({
  updateFaqEntryForAdmin: vi.fn(),
  deleteFaqEntryForAdmin: vi.fn(),
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
  return new NextRequest("http://localhost/api/admin/faqs/a", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new NextRequest("http://localhost/api/admin/faqs/a", {
    method: "DELETE",
  });
}

test("PATCH rejects a non-admin session with 403", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(nonAdminSession as never);

  const { PATCH } = await import("./route");
  const res = await PATCH(patchRequest({ answer: "Updated." }), {
    params: Promise.resolve({ id: "a" }),
  });

  assert.equal(res.status, 403);
});

test("PATCH rejects an empty body with 400", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { updateFaqEntryForAdmin } =
    await import("@/application/services/faqService");

  const { PATCH } = await import("./route");
  const res = await PATCH(patchRequest({}), {
    params: Promise.resolve({ id: "a" }),
  });

  assert.equal(res.status, 400);
  assert.equal(vi.mocked(updateFaqEntryForAdmin).mock.calls.length, 0);
});

test("PATCH updates the entry for an admin request", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { updateFaqEntryForAdmin } =
    await import("@/application/services/faqService");
  vi.mocked(updateFaqEntryForAdmin).mockResolvedValue({
    id: "a",
    question: { PT: "Q?", EN: "Question?" },
    answer: { PT: "Atualizada.", EN: "Updated." },
    order: 0,
  } as never);

  const { PATCH } = await import("./route");
  const res = await PATCH(
    patchRequest({ answer: { PT: "Atualizada.", EN: "Updated." } }),
    { params: Promise.resolve({ id: "a" }) }
  );
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.answer.EN, "Updated.");
  assert.equal(vi.mocked(updateFaqEntryForAdmin).mock.calls[0]?.[0], "a");
});

test("PATCH maps a position conflict to 409", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { updateFaqEntryForAdmin } =
    await import("@/application/services/faqService");
  const { HttpError } = await import("@/types/HttpError");
  vi.mocked(updateFaqEntryForAdmin).mockRejectedValue(
    new HttpError("A posição já está ocupada.", 409)
  );

  const { PATCH } = await import("./route");
  const res = await PATCH(
    patchRequest({ question: { PT: "Existing?", EN: "Existing?" } }),
    { params: Promise.resolve({ id: "a" }) }
  );

  assert.equal(res.status, 409);
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

test("DELETE removes the entry and returns 204 for an admin request", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { deleteFaqEntryForAdmin } =
    await import("@/application/services/faqService");
  vi.mocked(deleteFaqEntryForAdmin).mockResolvedValue(undefined);

  const { DELETE } = await import("./route");
  const res = await DELETE(deleteRequest(), {
    params: Promise.resolve({ id: "a" }),
  });

  assert.equal(res.status, 204);
  assert.equal(vi.mocked(deleteFaqEntryForAdmin).mock.calls[0]?.[0], "a");
});
