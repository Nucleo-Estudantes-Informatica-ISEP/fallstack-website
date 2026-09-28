import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { HttpError } from "@/types/HttpError";
import getServerSession from "@/application/services/sessionService";
import {
  checkUploadRateLimit,
  readUploadFile,
  uploadFile,
} from "@/application/services/uploadService";

import { POST as avatarPost } from "./avatar/route";
import { POST as cvPost } from "./cv/route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/uploadService", () => ({
  checkUploadRateLimit: vi.fn(),
  readUploadFile: vi.fn(),
  uploadFile: vi.fn(),
}));

const student = {
  id: "signup-student",
  role: "STUDENT",
  student: null,
  employee: null,
  adminRole: null,
} as Awaited<ReturnType<typeof getServerSession>>;

describe.each([
  {
    name: "avatar",
    post: avatarPost,
    url: "http://localhost/api/storage/avatar",
  },
  { name: "cv", post: cvPost, url: "http://localhost/api/storage/cv" },
] as const)("$name upload", ({ name, post, url }) => {
  function request(withFile = true) {
    const form = new FormData();
    if (withFile)
      form.append("file", new File(["bytes"], "file", { type: "image/png" }));
    return new NextRequest(url, { method: "POST", body: form });
  }

  const send = (withFile = true) =>
    post(request(withFile), { params: Promise.resolve({}) });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(student);
    vi.mocked(checkUploadRateLimit).mockReturnValue({
      allowed: true,
      retryAfterMs: 0,
    });
    vi.mocked(readUploadFile).mockResolvedValue(
      new File(["bytes"], "file", { type: "image/png" })
    );
    vi.mocked(uploadFile).mockResolvedValue({
      id: "file-id",
      url: "/media/avatar/file-id",
    });
  });

  test("rejects unauthenticated upload", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect((await send()).status).toBe(401);
  });

  test("accepts student account before profile exists", async () => {
    const response = await send();
    expect(response.status).toBe(201);
    expect(uploadFile).toHaveBeenCalledWith(
      name,
      expect.objectContaining({ size: 5, type: "image/png" })
    );
  });

  test("rejects missing file", async () => {
    vi.mocked(readUploadFile).mockRejectedValue(
      new HttpError("Missing file", 400)
    );
    expect((await send(false)).status).toBe(400);
  });

  test("returns retry delay on rate limit", async () => {
    vi.mocked(checkUploadRateLimit).mockReturnValue({
      allowed: false,
      retryAfterMs: 1500,
    });
    const response = await send();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("2");
    expect(uploadFile).not.toHaveBeenCalled();
  });
});
