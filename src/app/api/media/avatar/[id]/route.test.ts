import { expect, test, vi } from "vitest";

import { getObject } from "@/application/services/objectStorageService";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/objectStorageService", () => ({
  avatarKey: (id: string) => `distribution/avatar/${id}`,
  getObject: vi.fn(),
}));

const id = "00000000-0000-4000-8000-000000000001";
const request = () =>
  GET(new Request(`http://localhost/api/media/avatar/${id}`), {
    params: Promise.resolve({ id }),
  });

test("serves valid public image bytes and MIME", async () => {
  vi.mocked(getObject).mockResolvedValue({
    bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]),
    contentType: "image/png",
  });
  const response = await request();
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/png");
  expect(response.headers.get("Cache-Control")).toContain("public");
});

test("refuses active content from storage", async () => {
  vi.mocked(getObject).mockResolvedValue({
    bytes: new TextEncoder().encode("<script>alert(1)</script>"),
    contentType: "text/html",
  });
  expect((await request()).status).toBe(404);
});
