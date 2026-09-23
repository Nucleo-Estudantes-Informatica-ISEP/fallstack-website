// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { putObject } from "@/application/services/objectStorageService";
import getServerSession from "@/application/services/sessionService";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/objectStorageService", () => ({
  avatarKey: (id: string) => `distribution/avatar/${id}`,
  logoKey: (id: string) => `distribution/logo/${id}`,
  cvKey: (id: string) => `distribution/cv/${id}.pdf`,
  publicAvatarUrl: (id: string) => `/api/media/avatar/${id}`,
  publicLogoUrl: (id: string) => `/api/media/logo/${id}`,
  putObject: vi.fn(),
}));

function request(bytes: Uint8Array, type: string) {
  const form = new FormData();
  form.append("file", new File([Buffer.from(bytes)], "logo", { type }));
  return new NextRequest("http://localhost/api/admin/storage/logo", {
    method: "POST",
    body: form,
  });
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const send = (bytes: Uint8Array, type: string) =>
  POST(request(bytes, type), { params: Promise.resolve({}) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: "ADMIN",
  } as never);
});

test("rejects non-admin sessions before accessing storage", async () => {
  vi.mocked(getServerSession).mockResolvedValue({ adminRole: null } as never);
  expect((await send(png, "image/png")).status).toBe(403);
  expect(putObject).not.toHaveBeenCalled();
});

test("uploads valid WebP to dedicated logo bucket and prefix", async () => {
  const response = await send(webp, "image/webp");
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({
    url: expect.stringMatching(/^\/api\/media\/logo\//),
    contentType: "image/webp",
  });
  expect(putObject).toHaveBeenCalledWith(
    "logo",
    expect.stringMatching(/^distribution\/logo\/[0-9a-f-]+$/),
    webp,
    "image/webp"
  );
});

test("rejects JPEG and mismatched logo signatures", async () => {
  expect(
    (await send(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg")).status
  ).toBe(400);
  expect((await send(png, "image/webp")).status).toBe(400);
  expect(putObject).not.toHaveBeenCalled();
});

test("rejects logos over the size limit", async () => {
  const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
  oversized.set(png);
  expect((await send(oversized, "image/png")).status).toBe(400);
  expect(putObject).not.toHaveBeenCalled();
});
