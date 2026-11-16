// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  session: null as unknown,
  checkRateLimit: vi.fn(),
  signCvUploadPart: vi.fn(),
}));
vi.mock("@/application/services/sessionService", () => ({
  default: () => mocks.session,
}));
vi.mock("@/application/services/rateLimitService", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));
vi.mock("@/application/services/directCvUploadService", () => ({
  signCvUploadPart: mocks.signCvUploadPart,
}));
const id = "00000000-0000-4000-8000-000000000001",
  context = { params: Promise.resolve({}) };
const request = (body: unknown) =>
  new NextRequest("http://localhost/api/storage/cv/multipart/parts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session = { id: "owner", role: "STUDENT" };
  mocks.checkRateLimit.mockResolvedValue({ status: "allowed" });
  mocks.signCvUploadPart.mockResolvedValue({
    url: "https://files.test/signed",
    headers: {},
  });
});
test("requires a student session", async () => {
  mocks.session = null;
  expect((await POST(request({}), context)).status).toBe(401);
  mocks.session = { id: "employee", role: "EMPLOYEE" };
  expect((await POST(request({}), context)).status).toBe(403);
  expect(mocks.signCvUploadPart).not.toHaveBeenCalled();
});
test("limiter failure closes admission before parsing or storage access", async () => {
  mocks.checkRateLimit.mockResolvedValue({ status: "unavailable" });
  const req = request({});
  const read = vi.spyOn(req, "json");
  expect((await POST(req, context)).status).toBe(503);
  expect(read).not.toHaveBeenCalled();
  expect(mocks.signCvUploadPart).not.toHaveBeenCalled();
});
test("rejects arbitrary part numbers, checksum shapes and storage identifiers", async () => {
  for (const body of [
    { uploadId: id, partNumber: 3, checksum: "a".repeat(43) + "=" },
    { uploadId: id, partNumber: 1, checksum: "bad" },
    {
      uploadId: id,
      partNumber: 1,
      checksum: "a".repeat(43) + "=",
      key: "victim",
    },
  ])
    expect((await POST(request(body), context)).status).toBe(400);
  expect(mocks.signCvUploadPart).not.toHaveBeenCalled();
});
test("derives owner from session and disables caching of signed responses", async () => {
  const checksum = "a".repeat(43) + "=";
  const response = await POST(
    request({ uploadId: id, partNumber: 1, checksum }),
    context
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(mocks.signCvUploadPart).toHaveBeenCalledWith("owner", id, 1, checksum);
});
