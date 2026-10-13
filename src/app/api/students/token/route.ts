import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { tooManyRequestsResponse } from "@/lib/rateLimit";
import { jwtStudent } from "@/application/services/studentTokenService";
import { studentTokenSchema } from "@/schemas/studentTokenSchema";

const INVALID_CODE_WINDOW_MS = 60_000;
const INVALID_CODE_MAX = 5;

type InvalidCodeBucket = {
  count: number;
  resetAt: number;
};

const invalidCodeBuckets = new Map<string, InvalidCodeBucket>();

function checkInvalidCodeLimit(employeeId: string) {
  const now = Date.now();
  const bucket = invalidCodeBuckets.get(employeeId);

  if (!bucket || bucket.resetAt <= now) {
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= INVALID_CODE_MAX) {
    return {
      allowed: false,
      retryAfterMs: bucket.resetAt - now,
    };
  }

  return { allowed: true, retryAfterMs: 0 };
}

function recordInvalidCode(employeeId: string) {
  const now = Date.now();
  const bucket = invalidCodeBuckets.get(employeeId);

  if (!bucket || bucket.resetAt <= now) {
    invalidCodeBuckets.set(employeeId, {
      count: 1,
      resetAt: now + INVALID_CODE_WINDOW_MS,
    });
    return;
  }

  bucket.count += 1;
}

export const POST = defineHandler({
  auth: "employee",
  schema: studentTokenSchema,
  handler: async ({ body, session }) => {
    const employeeId = session?.employee?.id;
    if (!employeeId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const limit = checkInvalidCodeLimit(employeeId);
    if (!limit.allowed) return tooManyRequestsResponse(limit.retryAfterMs);

    const token = await jwtStudent(body.code);
    if (!token) {
      recordInvalidCode(employeeId);
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ token }, { status: 200 });
  },
});
