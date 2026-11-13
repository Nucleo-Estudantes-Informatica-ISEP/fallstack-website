import { expect, test, vi } from "vitest";

import { HttpError } from "@/types/HttpError";

import {
  createSessionCheckIn,
  findScheduleEventForCheckIn,
  findStudentForCheckIn,
  isSessionCheckInUniqueError,
} from "../repositories/sessionCheckInRepository";
import { recordSessionCheckIn } from "./sessionCheckInService";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/authService", () => ({
  verifyJwt: vi.fn(),
}));
vi.mock("../repositories/sessionCheckInRepository", () => ({
  createSessionCheckIn: vi.fn(),
  findScheduleEventForCheckIn: vi.fn(),
  findStudentForCheckIn: vi.fn(),
  isSessionCheckInUniqueError: vi.fn(),
}));

const session = {
  id: "session-1",
  day: 1,
  startTime: "10:00",
  endTime: "11:00",
};
const student = { id: "student-1", code: "AB12" };
const now = new Date("2026-11-17T10:30:00.000Z");

function setup() {
  vi.mocked(findScheduleEventForCheckIn).mockResolvedValue(session as never);
  vi.mocked(findStudentForCheckIn).mockResolvedValue(student as never);
  vi.mocked(createSessionCheckIn).mockResolvedValue({
    id: "check-in-1",
    sessionId: "session-1",
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
    purpose: "student-pass",
    exp: 1900000000,
  } as never);

  await recordSessionCheckIn(
    "session-1",
    "staff-1",
    { token: "valid-pass-token" },
    now
  );

  expect(createSessionCheckIn).toHaveBeenCalledWith({
    sessionId: "session-1",
    studentId: "student-1",
    scannedById: "staff-1",
  });
});

test.each([
  ["permanent code", { permanentCode: "ab12" }],
  ["typed code", { typedCode: "AB12" }],
  ["generic code", { code: "AB12" }],
])("records a check-in from a %s", async (_label, input) => {
  await recordSessionCheckIn("session-1", "staff-1", input, now);
  expect(findStudentForCheckIn).toHaveBeenCalledWith("AB12");
});

test("rejects an expired or invalid pass token", async () => {
  const { verifyJwt } = await import("@/application/services/authService");
  vi.mocked(verifyJwt).mockReturnValue(null);

  await expect(
    recordSessionCheckIn(
      "session-1",
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
    recordSessionCheckIn("session-1", "staff-1", { code: "ZZ99" }, now)
  ).rejects.toMatchObject(new HttpError("Student code not found.", 404));
});

test("maps a concurrent duplicate check-in to a clear conflict", async () => {
  vi.mocked(createSessionCheckIn).mockRejectedValue(new Error("P2002"));
  vi.mocked(isSessionCheckInUniqueError).mockReturnValue(true);

  await expect(
    recordSessionCheckIn("session-1", "staff-1", { code: "AB12" }, now)
  ).rejects.toMatchObject(
    new HttpError("This student has already checked in for this session.", 409)
  );
});

test.each([
  ["before", new Date("2026-11-17T09:59:59.999Z")],
  ["after", new Date("2026-11-17T11:00:00.001Z")],
])("rejects a check-in %s the session", async (_label, outsideTime) => {
  await expect(
    recordSessionCheckIn("session-1", "staff-1", { code: "AB12" }, outsideTime)
  ).rejects.toMatchObject(
    new HttpError("Check-in is not available outside this session.", 400)
  );
  expect(createSessionCheckIn).not.toHaveBeenCalled();
});

test("rejects tokens without the student-pass purpose", async () => {
  const { verifyJwt } = await import("@/application/services/authService");
  vi.mocked(verifyJwt).mockReturnValue({ code: "AB12" } as never);
  await expect(
    recordSessionCheckIn("session-1", "staff-1", { token: "other" }, now)
  ).rejects.toMatchObject({ status: 400 });
  expect(verifyJwt).toHaveBeenCalledWith("other", { algorithms: ["HS256"] });
});

test("rejects a pass token without an expiry", async () => {
  const { verifyJwt } = await import("@/application/services/authService");
  vi.mocked(verifyJwt).mockReturnValue({
    code: "AB12",
    purpose: "student-pass",
  } as never);
  await expect(
    recordSessionCheckIn("session-1", "staff-1", { token: "no-expiry" }, now)
  ).rejects.toMatchObject({ status: 400 });
});
