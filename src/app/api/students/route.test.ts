import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";
import { createStudentProfile } from "@/application/services/studentService";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
} from "@/domain/student/signupPolicy";

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
  createStudentProfile: vi.fn(),
}));
vi.mock("@/application/dto/studentDto", () => ({
  toStudentSummaryDto: (student: unknown) => student,
}));

const session = {
  id: "student-id",
  email: "student@example.test",
  authName: "Estudante AuthNEI",
  role: "STUDENT",
  adminRole: null,
  student: null,
};

const fields = {
  year: "1º Ano Licenciatura",
  course: "Engenharia Informática",
  interests: [],
  linkedin: "https://www.linkedin.com/in/student",
  privacyPolicyAccepted: true,
  termsAccepted: true,
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  termsVersion: TERMS_VERSION,
};

function post(body: unknown) {
  const request = new NextRequest("http://localhost/api/students", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return POST(request, { params: Promise.resolve({}) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockEnv.EVENT_MODE = "active";

  vi.mocked(getServerSession).mockResolvedValue(session as never);
  vi.mocked(createStudentProfile).mockResolvedValue({
    id: session.id,
  } as never);
});

test("creates a student with the verified AuthNEI name when the form omits it", async () => {
  expect((await post(fields)).status).toBe(201);

  expect(createStudentProfile).toHaveBeenCalledWith(session.id, {
    ...fields,
    name: session.authName,
  });
});

test("uses the name from the form when the identity has no display name", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    ...session,
    authName: undefined,
  } as never);

  expect((await post({ ...fields, name: "Maria Silva" })).status).toBe(201);

  expect(createStudentProfile).toHaveBeenCalledWith(session.id, {
    ...fields,
    name: "Maria Silva",
  });
});

test("rejects signup without any name instead of deriving one from the email", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    ...session,
    authName: undefined,
  } as never);

  const response = await post(fields);

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: expect.any(String),
  });
  expect(createStudentProfile).not.toHaveBeenCalled();
});

test("rejects a LinkedIn URL the profile editor would not accept", async () => {
  const response = await post({
    ...fields,
    linkedin: "https://evil.example/in/user",
  });

  expect(response.status).toBe(400);
  expect(createStudentProfile).not.toHaveBeenCalled();
});

test("an existing student cannot create another profile", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    ...session,
    student: { code: "A123", name: "Estudante AuthNEI" },
  } as never);

  expect((await post(fields)).status).toBe(403);
  expect(createStudentProfile).not.toHaveBeenCalled();
});

test.each([
  "course",
  "privacyPolicyAccepted",
  "termsAccepted",
  "privacyPolicyVersion",
  "termsVersion",
])("direct signup rejects missing %s before writes", async (field) => {
  const body = { ...fields } as Record<string, unknown>;
  delete body[field];

  expect((await post(body)).status).toBe(400);
  expect(createStudentProfile).not.toHaveBeenCalled();
});

test.each([
  { privacyPolicyAccepted: false },
  { termsAccepted: false },
  { privacyPolicyVersion: "old" },
  { termsVersion: "old" },
  { course: "  " },
])("direct signup rejects invalid consent or course: %j", async (override) => {
  expect((await post({ ...fields, ...override })).status).toBe(400);
  expect(createStudentProfile).not.toHaveBeenCalled();
});

test("valid signup trims the course and ignores a forged consent timestamp", async () => {
  const response = await post({
    ...fields,
    course: ` ${fields.course} `,
    consentAcceptedAt: "2000-01-01",
  });

  expect(response.status).toBe(201);
  expect(createStudentProfile).toHaveBeenCalledWith(session.id, {
    ...fields,
    name: session.authName,
  });
});

test("rejects new student registrations during offseason", async () => {
  mockEnv.EVENT_MODE = "offseason";

  const response = await post(fields);

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    error: "As inscrições estão encerradas.",
  });
  expect(createStudentProfile).not.toHaveBeenCalled();
});
