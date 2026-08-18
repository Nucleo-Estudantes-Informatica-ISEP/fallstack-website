import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";

import { POST as avatarPost } from "./avatar/route";
import { POST as cvPost } from "./cv/route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
const { createSignedUploadUrl } = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    storage: { from: vi.fn(() => ({ createSignedUploadUrl })) },
  })),
}));

function studentSession(id: string) {
  return {
    id,
    zitadelUserId: `zitadel-${id}`,
    email: `${id}@isep.ipp.pt`,
    role: "STUDENT",
    adminRole: null,
    student: { id, code: "S123", name: "Student" },
    employee: null,
    active: true,
  } as Awaited<ReturnType<typeof getServerSession>>;
}

const routeCases = [
  {
    name: "avatar",
    post: avatarPost,
    url: "http://localhost/api/storage/avatar",
    contentType: "image/png",
    storagePath: "distribution/avatar/id",
    pathPattern: /^distribution\/avatar\//,
  },
  {
    name: "CV",
    post: cvPost,
    url: "http://localhost/api/storage/cv",
    contentType: "application/pdf",
    storagePath: "distribution/cv/id.pdf",
    pathPattern: /^distribution\/cv\/.+\.pdf$/,
  },
] as const;

describe.each(routeCases)("$name upload ticket route", (routeCase) => {
  function request() {
    return new NextRequest(routeCase.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contentType: routeCase.contentType,
        size: 1024,
      }),
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
      email: "student-signup@isep.ipp.pt",
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
    vi.mocked(getServerSession).mockResolvedValue(
      studentSession("student-three")
    );

    for (let i = 0; i < 5; i++) {
      const res = await post();
      expect(res.status).toBe(201);
    }

    const blocked = await post();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);

    vi.mocked(getServerSession).mockResolvedValue(
      studentSession("student-two")
    );
    const allowed = await post();
    expect(allowed.status).toBe(201);
  });

  test("returns a ticket without receiving file bytes", async () => {
    createSignedUploadUrl.mockResolvedValue({
      data: { token: "signed-token", path: routeCase.storagePath },
      error: null,
    });
    vi.mocked(getServerSession).mockResolvedValue(
      studentSession("student-one")
    );

    const res = await post();
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: expect.any(String),
      path: expect.stringMatching(routeCase.pathPattern),
      token: "signed-token",
    });
  });
});
