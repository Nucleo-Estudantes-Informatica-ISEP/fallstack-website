import { expect, test, vi } from "vitest";

import { getObject } from "@/application/services/objectStorageService";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/objectStorageService", () => ({
  avatarKey: (id: string) => `distribution/avatar/${id}`,
  logoKey: (id: string) => `distribution/logo/${id}`,
  getObject: vi.fn(),
}));
const id = "00000000-0000-4000-8000-000000000001";
const request = (type = "avatar") =>
  GET(new Request(`http://localhost/api/media/${type}/${id}`), {
    params: Promise.resolve({ type, id }),
  });

test("serves valid public avatar bytes and MIME", async () => {
  vi.mocked(getObject).mockResolvedValue({
    bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]),
    contentType: "image/png",
  });
  const response = await request();
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/png");
  expect(response.headers.get("Cache-Control")).toContain("public");
});

test("serves valid WebP logos from the logo bucket", async () => {
  vi.mocked(getObject).mockResolvedValue({
    bytes: new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]),
    contentType: "image/webp",
  });
  const response = await request("logo");
  expect(response.status).toBe(200);
  expect(getObject).toHaveBeenCalledWith("logo", `distribution/logo/${id}`);
  expect(response.headers.get("Content-Type")).toBe("image/webp");
});

test("refuses active content from storage", async () => {
  vi.mocked(getObject).mockResolvedValue({
    bytes: new TextEncoder().encode("<script>alert(1)</script>"),
    contentType: "text/html",
  });
  expect((await request()).status).toBe(404);
});
