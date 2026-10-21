import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { beforeEach, test, vi } from "vitest";

import { publicDataCache } from "@/application/services/publicDataCache";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/faqService", () => ({
  getFaqEntries: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  publicDataCache.invalidate();
});

test("GET returns the FAQ list without requiring a session", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(null);

  const { getFaqEntries } = await import("@/application/services/faqService");
  vi.mocked(getFaqEntries).mockResolvedValue([
    {
      id: "a",
      question: { PT: "Pergunta?", EN: "Question?" },
      answer: { PT: "Resposta.", EN: "Answer." },
      order: 0,
    },
  ] as never);

  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest("http://localhost/api/faqs", {
      headers: { "accept-language": "en-GB" },
    }),
    { params: Promise.resolve({}) }
  );
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(vi.mocked(getServerSession).mock.calls.length, 0);
  assert.equal(body.length, 1);
  assert.equal(body[0].question, "Question?");
});
