import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";

import { POST } from "./route";

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

function request() {
  return new NextRequest("http://localhost/api/storage/avatar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contentType: "image/png", size: 1024 }),
  });
}

function studentSession(id: string) {
  return {
    id,
    role: "STUDENT",
    adminRole: null,
    student: { id, code: "S123", name: "Student" },
    employee: null,
  } as Awaited<ReturnType<typeof getServerSession>>;
}

const post = () => POST(request(), { params: Promise.resolve({}) });

test("rejects an unauthenticated upload with 401", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);

  const res = await post();

  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: "Unauthorized" });
});

test("limits one student without blocking another on same event Wi-Fi", async () => {
  createSignedUploadUrl.mockResolvedValue({
    data: { token: "signed-token", path: "distribution/avatar/id" },
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

  vi.mocked(getServerSession).mockResolvedValue(studentSession("student-two"));
  const allowed = await post();
  expect(allowed.status).toBe(201);
});

test("returns an upload ticket without receiving image bytes", async () => {
  createSignedUploadUrl.mockResolvedValue({
    data: { token: "signed-token", path: "distribution/avatar/id" },
    error: null,
  });
  vi.mocked(getServerSession).mockResolvedValue(studentSession("student-one"));

  const res = await post();
  expect(res.status).toBe(201);
  expect(await res.json()).toEqual({
    id: expect.any(String),
    path: expect.stringMatching(/^distribution\/avatar\//),
    token: "signed-token",
  });
});
