import "server-only";

import type { AttendanceSessionDto } from "@/types/AttendanceSession";
import { HttpError } from "@/types/HttpError";
import logger from "@/lib/logger";
import { verifyJwt } from "@/application/services/authService";
import {
  attendancePeriodsForDay,
  findAttendancePeriod,
} from "@/domain/session/attendancePeriods";
import { eventDayIndex, isWithinSession } from "@/domain/session/sessionRules";
import {
  isStudentCode,
  normalizeStudentCode,
} from "@/domain/student/studentCode";
import { branding } from "@/edition/branding";

import {
  countSessionCheckIns,
  createSessionCheckIn,
  findStudentForCheckIn,
  isSessionCheckInUniqueError,
} from "../repositories/sessionCheckInRepository";

type CredentialInput = {
  token?: string;
  code?: string;
  permanentCode?: string;
  typedCode?: string;
};

function getCodeFromToken(token: string) {
  const decoded = verifyJwt(token, { algorithms: ["HS256"] });
  const code =
    decoded &&
    typeof decoded === "object" &&
    "purpose" in decoded &&
    decoded.purpose === "attendance" &&
    "exp" in decoded &&
    typeof decoded.exp === "number" &&
    "code" in decoded &&
    typeof decoded.code === "string"
      ? decoded.code
      : null;
  if (!code) throw new HttpError("Invalid or expired pass token.", 400);
  return code;
}

function resolveCode(input: CredentialInput) {
  if (input.token) return getCodeFromToken(input.token);
  return input.code ?? input.permanentCode ?? input.typedCode ?? "";
}

export async function recordSessionCheckIn(
  sessionId: string,
  scannedById: string,
  input: CredentialInput,
  now = new Date()
) {
  const session = findAttendancePeriod(sessionId);
  if (!session) throw new HttpError("Attendance period not found.", 404);

  if (
    !isWithinSession(now, {
      start: new Date(session.start),
      end: new Date(session.end),
    })
  )
    throw new HttpError("Check-in is not available outside this period.", 400);

  const rawCode = resolveCode(input);
  const code = normalizeStudentCode(rawCode);
  if (!isStudentCode(code)) throw new HttpError("Invalid student code.", 400);

  const student = await findStudentForCheckIn(code);
  if (!student) {
    logger.warn(
      { event: "attendance_student_miss", scannedById, sessionId },
      "Attendance credential did not match a student"
    );
    throw new HttpError("Invalid student credential.", 400);
  }

  try {
    const checkIn = await createSessionCheckIn({
      day: session.day,
      period: session.period,
      studentId: student.id,
      scannedById,
    });
    return { ...checkIn, student: { name: student.name } };
  } catch (error) {
    if (isSessionCheckInUniqueError(error))
      throw new HttpError(
        "This student has already checked in for this period.",
        409,
        { student: { name: student.name } }
      );
    throw error;
  }
}

export async function getSessionCheckInCount(sessionId: string) {
  const session = findAttendancePeriod(sessionId);
  if (!session) throw new HttpError("Attendance period not found.", 404);
  return countSessionCheckIns(session);
}

/** Exactly two attendance periods per event day, independent of activities. */
export async function getTodaysAttendanceSessions(
  now = new Date()
): Promise<AttendanceSessionDto[]> {
  const { days, startsAt } = branding.event;
  const day = eventDayIndex(now, days, startsAt);
  return day === null ? [] : attendancePeriodsForDay(day);
}
