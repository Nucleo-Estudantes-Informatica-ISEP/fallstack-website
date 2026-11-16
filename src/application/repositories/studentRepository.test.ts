import { beforeEach, expect, test, vi } from "vitest";

import {
  connectStudentInterests,
  createStudent,
  setStudentInterests,
} from "./studentRepository";

const { update, create } = vi.hoisted(() => ({
  update: vi.fn(),
  create: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({
  default: { student: { update, create } },
}));

const AI_ID = "00000000-0000-4000-8000-000000000001";
const WEB_ID = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({ id: "user-id" });
});

test("sets interest relations directly by stable id", async () => {
  await setStudentInterests("user-id", [AI_ID, WEB_ID]);

  expect(update).toHaveBeenCalledWith({
    where: { id: "user-id" },
    data: { interests: { set: [{ id: AI_ID }, { id: WEB_ID }] } },
  });
});

test("connects interest relations directly by stable id", async () => {
  await connectStudentInterests("user-id", [AI_ID]);

  expect(update).toHaveBeenCalledWith({
    where: { id: "user-id" },
    data: { interests: { connect: [{ id: AI_ID }] } },
  });
});

test("persists signup course and consent evidence without altering versions or time", async () => {
  const consentAcceptedAt = new Date("2026-11-11T20:00:00Z");
  await createStudent({
    userId: "student",
    code: "123",
    name: "Student",
    year: "LICENCIATURA_3",
    course: "Engenharia Informática",
    privacyPolicyAccepted: true,
    termsAccepted: true,
    privacyPolicyVersion: "2026-10-31",
    termsVersion: "2026-11-11",
    consentAcceptedAt,
  });
  expect(create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      course: "Engenharia Informática",
      privacyPolicyAccepted: true,
      termsAccepted: true,
      privacyPolicyVersion: "2026-10-31",
      termsVersion: "2026-11-11",
      consentAcceptedAt,
    }),
  });
});
