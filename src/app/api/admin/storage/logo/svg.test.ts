// @vitest-environment node
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { beforeEach, expect, test, vi } from "vitest";

import { putObjectStream } from "@/application/services/objectStorageService";
import getServerSession from "@/application/services/sessionService";

import { GET } from "../../../media/[type]/[id]/route";
import { POST as uploadAvatar } from "../avatar/route";
import { POST as uploadLogo } from "./route";

const storage = vi.hoisted(
  () => new Map<string, { bytes: Buffer; contentType: string }>()
);
vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/objectStorageService", () => ({
  avatarKey: (id: string) => `distribution/avatar/${id}`,
  logoKey: (id: string) => `distribution/logo/${id}`,
  cvKey: (id: string) => `distribution/cv/${id}.pdf`,
  publicAvatarUrl: (id: string) => `/api/media/avatar/${id}`,
  publicLogoUrl: (id: string) => `/api/media/logo/${id}`,
  putObjectStream: vi.fn(async (_kind, key, stream, contentType) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    storage.set(key, { bytes: Buffer.concat(chunks), contentType });
  }),
  getObject: vi.fn(async (_kind, key) => storage.get(key) ?? null),
  deleteObject: vi.fn(),
}));

function request(bytes: Buffer, type = "image/svg+xml") {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(bytes)], "logo.svg", { type }));
  return new NextRequest("http://localhost/api/admin/storage/logo", {
    method: "POST",
    body: form,
  });
}
const fixture = (name: string) =>
  readFileSync(`tests/fixtures/svg/${name}.svg`);
const context = { params: Promise.resolve({}) };
beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: "ADMIN",
  } as never);
});

test("normal logo uploads, serves and rasterizes at configured dimensions", async () => {
  const response = await uploadLogo(request(fixture("logo")), context);
  expect(response.status).toBe(201);
  const { id, url } = await response.json();
  expect(url).toBe(`/api/media/logo/${id}`);
  const media = await GET(new Request(`http://localhost${url}`), {
    params: Promise.resolve({ type: "logo", id }),
  });
  expect(media.status).toBe(200);
  expect(media.headers.get("content-type")).toBe("image/svg+xml");
  expect(media.headers.get("x-content-type-options")).toBe("nosniff");
  const bytes = Buffer.from(await media.arrayBuffer());
  const { data, info } = await sharp(bytes)
    .resize(200, 200)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(info.width).toBe(200);
  expect(data[(50 * 200 + 100) * 4 + 1]).toBeGreaterThan(100);
});

test("malicious logos and SVG avatars are rejected before storage", async () => {
  expect(
    (await uploadLogo(request(fixture("malicious")), context)).status
  ).toBe(400);
  expect(putObjectStream).not.toHaveBeenCalled();
  expect((await uploadAvatar(request(fixture("logo")), context)).status).toBe(
    400
  );
  expect(putObjectStream).not.toHaveBeenCalled();
});

test.each([
  Buffer.from("not XML"),
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><g></svg>'),
])("invalid bytes never reach storage", async (bytes) => {
  expect((await uploadLogo(request(bytes), context)).status).toBe(400);
  expect(putObjectStream).not.toHaveBeenCalled();
});
