import { describe, beforeEach, expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";
import { createClient } from "@/utils/supabase/server";

vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));

const createSignedUploadUrl = vi.fn();
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({ createSignedUploadUrl })),
    },
  })),
}));

describe.each([
  {
    label: "avatar",
    module: "./avatar/route",
    storagePath: "student-signup/avatar.webp",
    body: { filename: "avatar.webp" },
  },
  {
    label: "cv",
    module: "./cv/route",
    storagePath: "student-signup/cv.pdf",
    body: { filename: "cv.pdf" },
  },
])("$label upload route", ({ module, storagePath, body }) => {
  let routeCase: {
    post: (
      request: Request,
      context: { params: Promise<Record<string, string>> }
    ) => Promise<Response>;
    storagePath: string;
  };

  beforeEach(async () => {
    vi.resetModules();
    createSignedUploadUrl.mockReset();
    vi.mocked(createClient).mockClear();

    const route = await import(module);
    routeCase = { post: route.POST, storagePath };
  });

  function request() {
    return new Request("http://localhost/api/storage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const post = () => routeCase.post(request(), { params: Promise.resolve({}) });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects an unauthenticated upload with 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await post();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  test("allows a student-role session before its profile is created", async () => {
    createSignedUploadUrl.mockResolvedValue({
      data: { token: "signed-token", path: routeCase.storagePath },
      error: null,
    });
    vi.mocked(getServerSession).mockResolvedValue({
      id: "student-signup",
      zitadelUserId: "zitadel-student-signup",
      email: "student@isep.ipp.pt",
      role: "STUDENT",
      adminRole: null,
      student: null,
      employee: null,
      active: true,
    });

    const res = await post();

    expect(res.status).toBe(201);
  });

  test("limits one student without blocking another on same event Wi-Fi", async () => {
    createSignedUploadUrl.mockResolvedValue({
      data: { token: "signed-token", path: routeCase.storagePath },
      error: null,
    });

    for (let index = 0; index < 10; index += 1) {
      vi.mocked(getServerSession).mockResolvedValue({
        id: "student-a",
        zitadelUserId: "zitadel-student-a",
        email: "student-a@isep.ipp.pt",
        role: "STUDENT",
        adminRole: null,
        student: null,
        employee: null,
        active: true,
      });
      expect((await post()).status).toBe(201);
    }

    vi.mocked(getServerSession).mockResolvedValue({
      id: "student-a",
      zitadelUserId: "zitadel-student-a",
      email: "student-a@isep.ipp.pt",
      role: "STUDENT",
      adminRole: null,
      student: null,
      employee: null,
      active: true,
    });
    expect((await post()).status).toBe(429);

    vi.mocked(getServerSession).mockResolvedValue({
      id: "student-b",
      zitadelUserId: "zitadel-student-b",
      email: "student-b@isep.ipp.pt",
      role: "STUDENT",
      adminRole: null,
      student: null,
      employee: null,
      active: true,
    });
    expect((await post()).status).toBe(201);
  });
});
