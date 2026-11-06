// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, expect, test, vi } from "vitest";

import { putObjectStream } from "@/application/services/objectStorageService";
import { checkRateLimit } from "@/application/services/rateLimitService";
import getServerSession from "@/application/services/sessionService";

import { POST as avatar } from "../../src/app/api/storage/avatar/route";
import { POST as cv } from "../../src/app/api/storage/cv/route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/rateLimitService", () => ({
  checkRateLimit: vi.fn(),
}));
vi.mock("@/application/services/objectStorageService", () => ({
  cvKey: (id: string) => `distribution/cv/${id}.pdf`,
  avatarKey: (id: string) => `distribution/avatar/${id}`,
  publicAvatarUrl: (id: string) => `/api/media/avatar/${id}`,
  putObjectStream: vi.fn(async (_kind, _key, body) => {
    for await (const chunk of body) {
      void chunk;
    }
  }),
  deleteObject: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());
test.each([
  ["cv", cv],
  ["avatar", avatar],
] as const)(
  "%s awaits shared allowance and preserves 429/Retry-After; outage is 503 before body processing",
  async (kind, route) => {
    vi.mocked(getServerSession).mockResolvedValue({
      id: "student",
      role: "STUDENT",
      student: null,
      employee: null,
      adminRole: null,
    } as Awaited<ReturnType<typeof getServerSession>>);
    const send = () =>
      route(
        new NextRequest(`http://localhost/api/storage/${kind}`, {
          method: "POST",
          body: "not-multipart",
        }),
        { params: Promise.resolve({}) }
      );
    vi.mocked(checkRateLimit).mockResolvedValue({
      status: "limited",
      retryAfterMs: 1001,
    });
    const limited = await send();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("2");
    expect(await limited.json()).toEqual({ error: "Too many requests" });
    vi.mocked(checkRateLimit).mockResolvedValue({ status: "unavailable" });
    const unavailable = await send();
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("Retry-After")).toBe("1");
    expect(await unavailable.json()).toEqual({
      error: "Rate limiter unavailable",
    });
    expect(putObjectStream).not.toHaveBeenCalled();
    vi.mocked(checkRateLimit).mockResolvedValue({ status: "allowed" });
    const form = new FormData();
    form.append(
      "file",
      kind === "cv"
        ? new File(["%PDF-1.4\n%%EOF\n"], "cv.pdf", { type: "application/pdf" })
        : new File(
            [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])],
            "avatar.png",
            { type: "image/png" }
          )
    );
    const success = await route(
      new NextRequest(`http://localhost/api/storage/${kind}`, {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({}) }
    );
    expect(success.status).toBe(201);
    expect(checkRateLimit).toHaveBeenLastCalledWith(
      `upload_${kind}`,
      "student",
      { max: 5, windowMs: 60000 }
    );
    expect(putObjectStream).toHaveBeenCalledTimes(1);
  }
);
test("unauthenticated requests never consume Redis capacity", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  expect(
    (
      await cv(
        new NextRequest("http://localhost/api/storage/cv", { method: "POST" }),
        { params: Promise.resolve({}) }
      )
    ).status
  ).toBe(401);
  expect(checkRateLimit).not.toHaveBeenCalled();
});
