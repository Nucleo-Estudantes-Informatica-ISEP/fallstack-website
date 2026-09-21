import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";
import { createAdminClient } from "@/utils/supabase/admin";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const upload = vi.fn();
const getPublicUrl = vi.fn();
const from = vi.fn(() => ({ upload, getPublicUrl }));

function request(bytes: Uint8Array, type: string) {
  const form = new FormData();
  form.append(
    "file",
    new File([bytes.slice().buffer as ArrayBuffer], "logo", { type })
  );
  return { formData: async () => form } as NextRequest;
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

describe("admin logo upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAdminClient).mockReturnValue({
      storage: { from },
    } as never);
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          "https://example.supabase.co/storage/v1/object/public/logos/logo-id",
      },
    });
  });

  test("rejects non-admin sessions before accessing storage", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ adminRole: null } as never);

    const response = await POST(request(png, "image/png"));

    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  test("uploads valid WebP logos to the logos bucket and logo prefix", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      adminRole: "ADMIN",
    } as never);

    const response = await POST(request(webp, "image/webp"));

    expect(response.status).toBe(201);
    expect(from).toHaveBeenCalledWith("logos");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^distribution\/logo\/[0-9a-f-]+$/),
      webp,
      { contentType: "image/webp" }
    );
  });

  test("rejects avatar-only JPEG uploads", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      adminRole: "ADMIN",
    } as never);

    const response = await POST(
      request(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg")
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid file type" });
    expect(upload).not.toHaveBeenCalled();
  });

  test("rejects bytes that do not match the declared logo type", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      adminRole: "ADMIN",
    } as never);

    const response = await POST(request(png, "image/webp"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "File content does not match its type",
    });
    expect(upload).not.toHaveBeenCalled();
  });

  test("rejects logos larger than the logo-specific limit", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      adminRole: "ADMIN",
    } as never);
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    oversized.set(png);

    const response = await POST(request(oversized, "image/png"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "File too large" });
    expect(upload).not.toHaveBeenCalled();
  });
});
