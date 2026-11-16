import "server-only";

import type { AttendanceSessionDto } from "@/types/AttendanceSession";
import { HttpError } from "@/types/HttpError";
import logger from "@/lib/logger";
import { verifyJwt } from "@/application/services/authService";
import {
  eventDayIndex,
  getSessionWindow,
  isWithinSession,
} from "@/domain/session/sessionRules";
import {
  isStudentCode,
  normalizeStudentCode,
} from "@/domain/student/studentCode";
import { branding } from "@/edition/branding";

import { findAllScheduleEvents } from "../repositories/scheduleRepository";
import {
  countSessionCheckIns,
  createSessionCheckIn,
  findScheduleEventForCheckIn,
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
  const session = await findScheduleEventForCheckIn(sessionId);
  if (!session) throw new HttpError("Session not found.", 404);

  const window = getSessionWindow(
    session,
    branding.event.days,
    branding.event.startsAt
  );
  if (!window || !isWithinSession(now, window))
    throw new HttpError("Check-in is not available outside this session.", 400);

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
      sessionId,
      studentId: student.id,
      scannedById,
    });
    return { ...checkIn, student: { name: student.name } };
  } catch (error) {
    if (isSessionCheckInUniqueError(error))
      throw new HttpError(
        "This student has already checked in for this session.",
        409,
        { student: { name: student.name } }
      );
    throw error;
  }
}

export async function getSessionCheckInCount(sessionId: string) {
  const session = await findScheduleEventForCheckIn(sessionId);
  if (!session) throw new HttpError("Session not found.", 404);
  return countSessionCheckIns(sessionId);
}

/** Schedule entries of today's event day (Europe/Lisbon), in schedule order. */
export async function getTodaysAttendanceSessions(
  now = new Date()
): Promise<AttendanceSessionDto[]> {
  const { days, startsAt, scheduleDayTitles } = branding.event;
  const day = eventDayIndex(now, days, startsAt);
  if (day === null) return [];
  const events = await findAllScheduleEvents();
  return events.flatMap((event) => {
    if (event.day !== day) return [];
    const window = getSessionWindow(event, days, startsAt);
    if (!window) return [];
    return [
      {
        id: event.id,
        title: event.activity.PT,
        startTime: event.startTime,
        endTime: event.endTime,
        start: window.start.toISOString(),
        end: window.end.toISOString(),
        dayTitle: scheduleDayTitles[day - 1] ?? "",
      },
    ];
  });
}
