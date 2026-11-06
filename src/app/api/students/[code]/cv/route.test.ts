import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { HttpError } from "@/types/HttpError";
import getServerSession from "@/application/services/sessionService";
import {
  getStudentCv,
  setStudentCv,
} from "@/application/services/studentService";

import { GET, POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/studentService", () => ({
  getStudentCv: vi.fn(),
  setStudentCv: vi.fn(),
}));

const studentA = {
  id: "student-1",
  role: "STUDENT",
  student: { code: "S123" },
  employee: null,
  adminRole: null,
} as Awaited<ReturnType<typeof getServerSession>>;

const validUuid = "00000000-0000-4000-8000-000000000001";

function postRequest(code: string, body: unknown) {
  return new NextRequest(`http://localhost/api/students/${code}/cv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(code: string) {
  return new NextRequest(`http://localhost/api/students/${code}/cv`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue(studentA);
});

describe("POST /api/students/[code]/cv (attachment)", () => {
  test("accepts attachment when authenticated student owns the profile", async () => {
    vi.mocked(setStudentCv).mockResolvedValue(undefined);
    const res = await POST(postRequest("S123", { id: validUuid }), {
      params: Promise.resolve({ code: "S123" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(setStudentCv).toHaveBeenCalledWith("S123", validUuid);
  });

  test("rejects cross-user attachment attempt with 403 Forbidden", async () => {
    // Student A (code S123) attempts to attach a CV to Student B (code S456)
    const res = await POST(postRequest("S456", { id: validUuid }), {
      params: Promise.resolve({ code: "S456" }),
    });
    expect(res.status).toBe(403);
    expect(setStudentCv).not.toHaveBeenCalled();
  });

  test("rejects unauthenticated attachment with 401 Unauthorized", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(postRequest("S123", { id: validUuid }), {
      params: Promise.resolve({ code: "S123" }),
    });
    expect(res.status).toBe(401);
    expect(setStudentCv).not.toHaveBeenCalled();
  });

  test("rejects attachment when storage key does not exist or was purged", async () => {
    vi.mocked(setStudentCv).mockRejectedValue(
      new HttpError("Invalid upload id", 400)
    );
    const res = await POST(postRequest("S123", { id: validUuid }), {
      params: Promise.resolve({ code: "S123" }),
    });
    expect(res.status).toBe(400);
  });

  test("rejects non-uuid id payload", async () => {
    const res = await POST(postRequest("S123", { id: "not-a-uuid" }), {
      params: Promise.resolve({ code: "S123" }),
    });
    expect(res.status).toBe(400);
    expect(setStudentCv).not.toHaveBeenCalled();
  });
});

describe("GET /api/students/[code]/cv", () => {
  test("returns CV download URL for authorized viewer", async () => {
    vi.mocked(getStudentCv).mockResolvedValue("/api/students/S123/cv/file");
    const res = await GET(getRequest("S123"), {
      params: Promise.resolve({ code: "S123" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "/api/students/S123/cv/file" });
  });

  test("rejects unauthenticated GET with 401", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(getRequest("S123"), {
      params: Promise.resolve({ code: "S123" }),
    });
    expect(res.status).toBe(401);
  });
});
