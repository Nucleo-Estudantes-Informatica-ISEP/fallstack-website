import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import getServerSession from "@/application/services/sessionService";
import { createStudentProfile } from "@/application/services/studentService";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
} from "@/domain/student/signupPolicy";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));
vi.mock("@/application/services/studentService", () => ({
  createStudentProfile: vi.fn(),
}));
const valid = {
  name: "Student",
  year: "3º Ano Licenciatura",
  course: "Engenharia Informática",
  interests: [],
  linkedin: "https://linkedin.com/in/student",
  privacyPolicyAccepted: true,
  termsAccepted: true,
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  termsVersion: TERMS_VERSION,
};
const request = (body: object) =>
  POST(
    new NextRequest("http://localhost/api/students", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({}) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({
    id: "student",
    role: "STUDENT",
    student: null,
  } as never);
  vi.mocked(createStudentProfile).mockResolvedValue({
    id: "student",
    code: "123",
    name: "Student",
    year: "LICENCIATURA_3",
    course: valid.course,
    linkedin: valid.linkedin,
  } as never);
});
test.each([
  "course",
  "privacyPolicyAccepted",
  "termsAccepted",
  "privacyPolicyVersion",
  "termsVersion",
])("direct signup rejects missing %s before writes", async (field) => {
  const body = { ...valid } as Record<string, unknown>;
  delete body[field];
  expect((await request(body)).status).toBe(400);
  expect(createStudentProfile).not.toHaveBeenCalled();
});
test.each([
  { privacyPolicyAccepted: false },
  { termsAccepted: false },
  { privacyPolicyVersion: "old" },
  { termsVersion: "old" },
  { course: "  " },
])("direct signup rejects invalid consent or course: %j", async (override) => {
  expect((await request({ ...valid, ...override })).status).toBe(400);
  expect(createStudentProfile).not.toHaveBeenCalled();
});
test("valid signup returns stored course and LinkedIn and ignores forged timestamp", async () => {
  const response = await request({
    ...valid,
    course: ` ${valid.course} `,
    consentAcceptedAt: "2000-01-01",
  });
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({
    course: valid.course,
    linkedin: valid.linkedin,
  });
  expect(createStudentProfile).toHaveBeenCalledWith("student", valid);
});
test("existing accounts remain existing and cannot repeat signup", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    id: "student",
    role: "STUDENT",
    student: { code: "123" },
  } as never);
  expect((await request(valid)).status).toBe(403);
  expect(createStudentProfile).not.toHaveBeenCalled();
});
