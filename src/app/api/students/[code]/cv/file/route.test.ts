import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";
import { streamStudentCv } from "@/application/services/studentService";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/studentService", () => ({
  streamStudentCv: vi.fn(),
}));

const request = () =>
  new NextRequest("http://localhost/api/students/S123/cv/file");
const get = () => GET(request(), { params: Promise.resolve({ code: "S123" }) });

beforeEach(() => vi.clearAllMocks());

test("unauthenticated CV read is rejected before storage access", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  const response = await get();
  expect(response.status).toBe(401);
  expect(streamStudentCv).not.toHaveBeenCalled();
});

test("authenticated CV read passes existing access context and stays private", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    id: "employee",
    role: "EMPLOYEE",
    employee: { company: { id: "company-1" } },
    student: null,
    adminRole: null,
  } as Awaited<ReturnType<typeof getServerSession>>);
  vi.mocked(streamStudentCv).mockResolvedValue({
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([37, 80, 68, 70]));
        controller.close();
      },
    }),
    contentLength: 4,
    contentType: "application/pdf",
  });
  const response = await get();
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Length")).toBe("4");
  expect(await response.text()).toBe("%PDF");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(streamStudentCv).toHaveBeenCalledWith(
    "S123",
    {
      studentCode: undefined,
      companyId: "company-1",
      isAdmin: false,
    },
    expect.any(AbortSignal)
  );
});
