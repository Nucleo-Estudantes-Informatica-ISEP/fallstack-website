import "server-only";

import { HttpError } from "@/types/HttpError";
import { verifyJwt } from "@/application/services/authService";
import {
  getSessionWindow,
  isWithinSession,
} from "@/domain/session/sessionRules";
import {
  isStudentCode,
  normalizeStudentCode,
} from "@/domain/student/studentCode";
import { branding } from "@/edition/branding";

import {
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
  const decoded = verifyJwt(token);
  const code =
    decoded &&
    typeof decoded === "object" &&
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
  if (!student) throw new HttpError("Student code not found.", 404);

  try {
    return await createSessionCheckIn({
      sessionId,
      studentId: student.id,
      scannedById,
    });
  } catch (error) {
    if (isSessionCheckInUniqueError(error))
      throw new HttpError(
        "This student has already checked in for this session.",
        409
      );
    throw error;
  }
}
