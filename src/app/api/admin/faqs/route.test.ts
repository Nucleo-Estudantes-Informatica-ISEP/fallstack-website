import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/faqService", () => ({
  listFaqEntriesForAdmin: vi.fn(),
  createFaqEntryForAdmin: vi.fn(),
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
  return new NextRequest("http://localhost/api/admin/faqs", {
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
  const res = await GET(new NextRequest("http://localhost/api/admin/faqs"), {
    params: Promise.resolve({}),
  });

  assert.equal(res.status, 403);
});

test("GET returns the paginated list for an admin", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { listFaqEntriesForAdmin } =
    await import("@/application/services/faqService");
  vi.mocked(listFaqEntriesForAdmin).mockResolvedValue({
    items: [{ id: "a", question: "Q?", answer: "A.", order: 0 }],
    totalCount: 1,
  } as never);

  const { GET } = await import("./route");
  const res = await GET(new NextRequest("http://localhost/api/admin/faqs"), {
    params: Promise.resolve({}),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.totalCount, 1);
  assert.equal(body.items[0].question, "Q?");
});

test("POST rejects a malformed body with 400, without creating anything", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { createFaqEntryForAdmin } =
    await import("@/application/services/faqService");

  const { POST } = await import("./route");
  const res = await POST(postRequest({ question: "" }), {
    params: Promise.resolve({}),
  });

  assert.equal(res.status, 400);
  assert.equal(vi.mocked(createFaqEntryForAdmin).mock.calls.length, 0);
});

test("POST creates the entry and returns 201 for a valid admin request", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { createFaqEntryForAdmin } =
    await import("@/application/services/faqService");
  vi.mocked(createFaqEntryForAdmin).mockResolvedValue({
    id: "a",
    question: "Q?",
    answer: "A.",
    order: 0,
  } as never);

  const { POST } = await import("./route");
  const res = await POST(postRequest({ question: "Q?", answer: "A." }), {
    params: Promise.resolve({}),
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.id, "a");
  assert.equal(
    vi.mocked(createFaqEntryForAdmin).mock.calls[0]?.[0].question,
    "Q?"
  );
});

test("POST maps a duplicate-question conflict to 409", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(adminSession as never);

  const { createFaqEntryForAdmin } =
    await import("@/application/services/faqService");
  const { HttpError } = await import("@/types/HttpError");
  vi.mocked(createFaqEntryForAdmin).mockRejectedValue(
    new HttpError("Já existe uma pergunta igual.", 409)
  );

  const { POST } = await import("./route");
  const res = await POST(postRequest({ question: "Existing?", answer: "A." }), {
    params: Promise.resolve({}),
  });

  assert.equal(res.status, 409);
});
