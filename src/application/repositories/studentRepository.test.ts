import { beforeEach, expect, test, vi } from "vitest";

import { Email } from "@/types/Email";

import prisma from "./database";
import {
  connectStudentInterests,
  createStudent,
  findStudentByEmail,
  setStudentInterests,
} from "./studentRepository";

const { update, create, findMany } = vi.hoisted(() => ({
  update: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({
  default: { student: { update, create, findMany } },
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

test("email lookup refuses ambiguous self-declared contacts", async () => {
  const email = Email.create("1234567@isep.ipp.pt");
  vi.mocked(prisma.student.findMany).mockResolvedValue([
    { id: "one" },
    { id: "two" },
  ] as never);
  expect(await findStudentByEmail(email)).toBeNull();
  vi.mocked(prisma.student.findMany).mockResolvedValue([
    { id: "one" },
  ] as never);
  expect(await findStudentByEmail(email)).toEqual({ id: "one" });
  expect(prisma.student.findMany).toHaveBeenCalledWith({
    where: {
      OR: [
        { institutionalEmail: email },
        { institutionalEmail: null, user: { email } },
      ],
    },
    take: 2,
  });
});
