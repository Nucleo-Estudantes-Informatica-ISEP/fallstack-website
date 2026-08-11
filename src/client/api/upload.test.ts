import { beforeEach, describe, expect, it, vi } from "vitest";

const { post, uploadToSignedUrl } = vi.hoisted(() => ({
  post: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}));

vi.mock("@/lib/http/client", () => ({
  HttpClientError: class HttpClientError extends Error {},
  httpClient: { post },
}));

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        getPublicUrl: vi.fn(),
        uploadToSignedUrl,
      }),
    },
  }),
}));

import { uploadAvatar } from "./upload";

describe("uploadAvatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({ id: "avatar-id", path: "avatar-path", token: "token" });
  });

  it("returns null when Storage rejects a signed upload", async () => {
    uploadToSignedUrl.mockResolvedValue({ error: new Error("expired ticket") });
    const avatar = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
      type: "image/png",
    });

    await expect(uploadAvatar(avatar)).resolves.toBeNull();
  });
});
