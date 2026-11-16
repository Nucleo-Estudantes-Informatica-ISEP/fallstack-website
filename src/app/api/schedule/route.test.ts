import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { beforeEach, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/publicEditionService", () => ({
  getPublicSchedule: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("GET returns the schedule without requiring a session", async () => {
  const getServerSession = (
    await import("@/application/services/sessionService")
  ).default;
  vi.mocked(getServerSession).mockResolvedValue(null);

  const { getPublicSchedule } =
    await import("@/application/services/publicEditionService");
  vi.mocked(getPublicSchedule).mockResolvedValue([
    {
      id: "a",
      day: 1,
      order: 0,
      startTime: "09:00",
      endTime: "10:00",
      activity: "Opening",
    },
  ] as never);

  const { GET } = await import("./route");
  const res = await GET(
    new NextRequest("http://localhost/api/schedule", {
      headers: { "accept-language": "en" },
    }),
    { params: Promise.resolve({}) }
  );
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(vi.mocked(getServerSession).mock.calls.length, 0);
  assert.equal(vi.mocked(getPublicSchedule).mock.calls.length, 1);
  assert.equal(body.length, 1);
  assert.equal(body[0].activity, "Opening");
});
