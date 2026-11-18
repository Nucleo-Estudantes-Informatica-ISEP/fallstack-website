import { expect, test, vi } from "vitest";

import { HttpError } from "@/types/HttpError";

import {
  countSessionCheckIns,
  createSessionCheckIn,
  findStudentForCheckIn,
  isSessionCheckInUniqueError,
} from "../repositories/sessionCheckInRepository";
import {
  getSessionCheckInCount,
  getTodaysAttendanceSessions,
  recordSessionCheckIn,
} from "./sessionCheckInService";

vi.mock("@/lib/logger", () => ({ default: { warn: vi.fn() } }));
vi.mock("server-only", () => ({}));
vi.mock("@/application/services/authService", () => ({
  verifyJwt: vi.fn(),
}));
vi.mock("../repositories/sessionCheckInRepository", () => ({
  countSessionCheckIns: vi.fn(),
  createSessionCheckIn: vi.fn(),
  findStudentForCheckIn: vi.fn(),
  isSessionCheckInUniqueError: vi.fn(),
}));

const student = { id: "student-1", code: "AB12", name: "Maria Silva" };
const now = new Date("2026-11-17T10:30:00.000Z");

function setup() {
  vi.mocked(findStudentForCheckIn).mockResolvedValue(student as never);
  vi.mocked(createSessionCheckIn).mockResolvedValue({
    id: "check-in-1",
    day: 1,
    period: "MORNING",
    studentId: "student-1",
    scannedById: "staff-1",
    checkedInAt: now,
  });
  vi.mocked(isSessionCheckInUniqueError).mockReturnValue(false);
}

test.beforeEach(() => {
  vi.clearAllMocks();
  setup();
});

test("records a check-in from a pass token", async () => {
  const { verifyJwt } = await import("@/application/services/authService");
  vi.mocked(verifyJwt).mockReturnValue({
    code: "AB12",
    purpose: "attendance",
    exp: 1900000000,
  } as never);

  await recordSessionCheckIn(
    "1-morning",
    "staff-1",
    { token: "valid-pass-token" },
    now
  );

  expect(createSessionCheckIn).toHaveBeenCalledWith({
    day: 1,
    period: "MORNING",
    studentId: "student-1",
    scannedById: "staff-1",
  });
});

test.each([
  ["permanent code", { permanentCode: "ab12" }],
  ["typed code", { typedCode: "AB12" }],
  ["generic code", { code: "AB12" }],
])("records a check-in from a %s", async (_label, input) => {
  await recordSessionCheckIn("1-morning", "staff-1", input, now);
  expect(findStudentForCheckIn).toHaveBeenCalledWith("AB12");
});

test("rejects an expired or invalid pass token", async () => {
  const { verifyJwt } = await import("@/application/services/authService");
  vi.mocked(verifyJwt).mockReturnValue(null);

  await expect(
    recordSessionCheckIn(
      "1-morning",
      "staff-1",
      { token: "expired-token" },
      now
    )
  ).rejects.toMatchObject(new HttpError("Invalid or expired pass token.", 400));
  expect(findStudentForCheckIn).not.toHaveBeenCalled();
});

test("rejects an unknown student code", async () => {
  vi.mocked(findStudentForCheckIn).mockResolvedValue(null);

  await expect(
    recordSessionCheckIn("1-morning", "staff-1", { code: "ZZ99" }, now)
  ).rejects.toMatchObject(new HttpError("Invalid student credential.", 400));
});

test("maps a concurrent duplicate check-in to a clear conflict", async () => {
  vi.mocked(createSessionCheckIn).mockRejectedValue(new Error("P2002"));
  vi.mocked(isSessionCheckInUniqueError).mockReturnValue(true);

  await expect(
    recordSessionCheckIn("1-morning", "staff-1", { code: "AB12" }, now)
  ).rejects.toMatchObject(
    new HttpError("This student has already checked in for this period.", 409, {
      student: { name: "Maria Silva" },
    })
  );
});

test.each([
  ["before", new Date("2026-11-17T08:59:59.999Z")],
  ["after", new Date("2026-11-17T14:00:00.001Z")],
])("rejects a check-in %s the session", async (_label, outsideTime) => {
  await expect(
    recordSessionCheckIn("1-morning", "staff-1", { code: "AB12" }, outsideTime)
  ).rejects.toMatchObject(
    new HttpError("Check-in is not available outside this period.", 400)
  );
  expect(createSessionCheckIn).not.toHaveBeenCalled();
});

test("rejects tokens without the attendance purpose", async () => {
  const { verifyJwt } = await import("@/application/services/authService");
  vi.mocked(verifyJwt).mockReturnValue({ code: "AB12" } as never);
  await expect(
    recordSessionCheckIn("1-morning", "staff-1", { token: "other" }, now)
  ).rejects.toMatchObject({ status: 400 });
  expect(verifyJwt).toHaveBeenCalledWith("other", { algorithms: ["HS256"] });
});

test("rejects a pass token without an expiry", async () => {
  const { verifyJwt } = await import("@/application/services/authService");
  vi.mocked(verifyJwt).mockReturnValue({
    code: "AB12",
    purpose: "attendance",
  } as never);
  await expect(
    recordSessionCheckIn("1-morning", "staff-1", { token: "no-expiry" }, now)
  ).rejects.toMatchObject({ status: 400 });
});

test("rejects profile-preview tokens for attendance", async () => {
  const { verifyJwt } = await import("@/application/services/authService");
  vi.mocked(verifyJwt).mockReturnValue({
    code: "AB12",
    purpose: "student-pass",
    exp: 1900000000,
  } as never);
  await expect(
    recordSessionCheckIn("1-morning", "staff-1", { token: "preview" }, now)
  ).rejects.toMatchObject({ status: 400 });
  expect(createSessionCheckIn).not.toHaveBeenCalled();
});

test("logs unknown student attempts without exposing credentials", async () => {
  const logger = (await import("@/lib/logger")).default;
  vi.mocked(findStudentForCheckIn).mockResolvedValueOnce(null);
  await expect(
    recordSessionCheckIn("1-morning", "staff-1", { code: "AB12" }, now)
  ).rejects.toMatchObject({ status: 400 });
  expect(logger.warn).toHaveBeenCalledWith(
    {
      event: "attendance_student_miss",
      scannedById: "staff-1",
      sessionId: "1-morning",
    },
    "Attendance credential did not match a student"
  );
});

test("returns the student's name with a recorded check-in", async () => {
  const result = await recordSessionCheckIn(
    "1-morning",
    "staff-1",
    { code: "AB12" },
    now
  );
  expect(result.student).toEqual({ name: "Maria Silva" });
});

test("a duplicate check-in carries the student's name", async () => {
  vi.mocked(createSessionCheckIn).mockRejectedValue(new Error("P2002"));
  vi.mocked(isSessionCheckInUniqueError).mockReturnValue(true);
  await expect(
    recordSessionCheckIn("1-morning", "staff-1", { code: "AB12" }, now)
  ).rejects.toMatchObject({
    status: 409,
    details: { student: { name: "Maria Silva" } },
  });
});

test("an unknown credential exposes no details", async () => {
  vi.mocked(findStudentForCheckIn).mockResolvedValue(null);
  await expect(
    recordSessionCheckIn("1-morning", "staff-1", { code: "ZZ99" }, now)
  ).rejects.toMatchObject({ status: 400, details: undefined });
});

test("counts check-ins for an existing session", async () => {
  vi.mocked(countSessionCheckIns).mockResolvedValue(7);
  await expect(getSessionCheckInCount("1-morning")).resolves.toBe(7);
  expect(countSessionCheckIns).toHaveBeenCalledWith(
    expect.objectContaining({ day: 1, period: "MORNING" })
  );
});

test("counting an unknown session is a 404", async () => {
  await expect(getSessionCheckInCount("missing")).rejects.toMatchObject({
    status: 404,
  });
  expect(countSessionCheckIns).not.toHaveBeenCalled();
});

test.each([
  ["2026-11-17T10:30:00Z", ["1-morning", "1-afternoon"]],
  ["2026-11-18T14:30:00Z", ["2-morning", "2-afternoon"]],
  ["2026-11-16T10:30:00Z", []],
])("lists daily periods independent of the schedule: %s", async (now, ids) => {
  expect(
    (await getTodaysAttendanceSessions(new Date(now))).map((p) => p.id)
  ).toEqual(ids);
});
