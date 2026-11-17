import "client-only";

import { httpClient, HttpClientError } from "@/lib/http/client";
import {
  isStudentCode,
  normalizeStudentCode,
} from "@/domain/student/studentCode";

export type CheckInCredential =
  { token: string } | { code: string } | { typedCode: string };

export type CheckInOutcome =
  | { kind: "recorded"; name: string; checkedInAt: string }
  | { kind: "duplicate"; name: string }
  | { kind: "invalid-credential" }
  | { kind: "outside-session" }
  | { kind: "session-not-found" }
  | { kind: "rate-limited"; retryAfterSeconds: number }
  | { kind: "unavailable" }
  | { kind: "unauthorized" };

export type CheckInCountResult =
  | { kind: "count"; count: number }
  | { kind: "unauthorized" }
  | { kind: "error" };

// Exact message from sessionCheckInService; every other 400 is a bad credential.
const OUTSIDE_SESSION_MESSAGE =
  "Check-in is not available outside this period.";
const DEFAULT_RETRY_AFTER_SECONDS = 5;

const checkInsPath = (sessionId: string) =>
  `/sessions/${encodeURIComponent(sessionId)}/check-ins`;

function studentName(body: unknown) {
  const student =
    body && typeof body === "object" && "student" in body
      ? (body as { student?: { name?: unknown } }).student
      : undefined;
  return typeof student?.name === "string" ? student.name : "";
}

function outcomeFromError(error: unknown): CheckInOutcome {
  if (!(error instanceof HttpClientError)) return { kind: "unavailable" };
  switch (error.status) {
    case 401:
    case 403:
      return { kind: "unauthorized" };
    case 409:
      return { kind: "duplicate", name: studentName(error.body) };
    case 400:
      return error.message === OUTSIDE_SESSION_MESSAGE
        ? { kind: "outside-session" }
        : { kind: "invalid-credential" };
    case 404:
      return { kind: "session-not-found" };
    case 429: {
      const seconds = Number(error.headers?.get("Retry-After"));
      return {
        kind: "rate-limited",
        retryAfterSeconds:
          Number.isFinite(seconds) && seconds > 0
            ? seconds
            : DEFAULT_RETRY_AFTER_SECONDS,
      };
    }
    default:
      return { kind: "unavailable" };
  }
}

export async function recordCheckIn(
  sessionId: string,
  credential: CheckInCredential
): Promise<CheckInOutcome> {
  try {
    const result = await httpClient.post<{
      checkedInAt: string;
      student: { name: string };
    }>(checkInsPath(sessionId), credential);
    return {
      kind: "recorded",
      name: result.student.name,
      checkedInAt: result.checkedInAt,
    };
  } catch (error) {
    return outcomeFromError(error);
  }
}

export async function getCheckInCount(
  sessionId: string
): Promise<CheckInCountResult> {
  try {
    const { count } = await httpClient.get<{ count: number }>(
      `${checkInsPath(sessionId)}/count`
    );
    return { kind: "count", count };
  } catch (error) {
    if (
      error instanceof HttpClientError &&
      (error.status === 401 || error.status === 403)
    )
      return { kind: "unauthorized" };
    return { kind: "error" };
  }
}

export function credentialFromScan(text: string): CheckInCredential {
  const code = normalizeStudentCode(text);
  return isStudentCode(code) ? { code } : { token: text.trim() };
}
