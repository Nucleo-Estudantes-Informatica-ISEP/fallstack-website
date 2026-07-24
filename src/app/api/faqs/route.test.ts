import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/faqService", () => ({
  getFaqEntries: vi.fn(),
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

test("GET returns the FAQ list without requiring a session", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(null);

  const { getFaqEntries } = await import("@/application/services/faqService");
  vi.mocked(getFaqEntries).mockResolvedValue([
    { id: "a", question: "Q?", answer: "A.", order: 0 },
  ] as never);

  const { GET } = await import("./route");
  const res = await GET(new NextRequest("http://localhost/api/faqs"), {
    params: Promise.resolve({}),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].question, "Q?");
});
