// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { uploadCompanyVideo } from "@/application/services/companyVideoService";
import getServerSession from "@/application/services/sessionService";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/companyVideoService", () => ({
  uploadCompanyVideo: vi.fn(),
}));
beforeEach(() => vi.resetAllMocks());
const send = () =>
  POST(
    new NextRequest("http://localhost/api/admin/storage/video", {
      method: "POST",
    }),
    { params: Promise.resolve({}) }
  );
test("anonymous and student uploads cannot reach storage", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  expect((await send()).status).toBe(401);
  vi.mocked(getServerSession).mockResolvedValue({ adminRole: null } as never);
  expect((await send()).status).toBe(403);
  expect(uploadCompanyVideo).not.toHaveBeenCalled();
});
test("admin upload returns stored URL and 201", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: "ADMIN",
  } as never);
  vi.mocked(uploadCompanyVideo).mockResolvedValue({
    id: "12345678-1234-1234-1234-123456789abc",
    url: "/api/media/video/video",
    size: 24,
  });
  const res = await send();
  expect(res.status).toBe(201);
  expect(await res.json()).toMatchObject({ url: "/api/media/video/video" });
});
