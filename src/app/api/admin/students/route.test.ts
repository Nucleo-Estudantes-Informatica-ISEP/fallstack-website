import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";
import { createStudentForAdmin } from "@/application/services/studentService";
import { STUDENT_YEAR } from "@/domain/student/year";

import { POST } from "./route";

const mockEnv = vi.hoisted(() => ({
  EVENT_MODE: "active" as "active" | "offseason",
}));

vi.mock("server-only", () => ({}));
vi.mock("@/config/env.server", () => ({
  serverEnv: mockEnv,
}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/studentService", () => ({
  createStudentForAdmin: vi.fn(),
  listStudentsForAdmin: vi.fn(),
}));

const fields = {
  email: "student@example.test",
  code: "12345",
  name: "Estudante Teste",
  year: Object.keys(STUDENT_YEAR)[0],
};

function post() {
  return POST(
    new NextRequest("http://localhost/api/admin/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fields),
    }),
    { params: Promise.resolve({}) }
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mockEnv.EVENT_MODE = "active";
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: "ADMIN",
  } as never);
  vi.mocked(createStudentForAdmin).mockResolvedValue({
    id: "student-id",
  } as never);
});

test("active mode allows admin student creation", async () => {
  const response = await post();

  expect(response.status).toBe(201);
  expect(createStudentForAdmin).toHaveBeenCalledWith(fields);
});

test("offseason blocks admin student creation", async () => {
  mockEnv.EVENT_MODE = "offseason";

  const response = await post();

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    error: "As inscrições estão encerradas.",
  });
  expect(createStudentForAdmin).not.toHaveBeenCalled();
});

test("unauthenticated requests cannot create students", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);

  expect((await post()).status).toBe(401);
  expect(createStudentForAdmin).not.toHaveBeenCalled();
});

test("non-admin users cannot create students", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: null,
  } as never);

  expect((await post()).status).toBe(403);
  expect(createStudentForAdmin).not.toHaveBeenCalled();
});
