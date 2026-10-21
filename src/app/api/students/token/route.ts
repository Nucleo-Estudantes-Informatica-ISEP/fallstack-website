import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import logger from "@/lib/logger";
import { createRateLimiter, tooManyRequestsResponse } from "@/lib/rateLimit";
import { jwtStudent } from "@/application/services/studentTokenService";
import { studentTokenSchema } from "@/schemas/studentTokenSchema";

const invalidCodeLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
});

// Serialize each employee so in-flight valid scans never exhaust the budget.
const pendingLookups = new Map<string, Promise<void>>();

export const POST = defineHandler({
  auth: "employee",
  schema: studentTokenSchema,
  handler: async ({ body, session }) => {
    const employeeId = session?.employee?.id;

    if (!employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employeeRef = createHash("sha256").update(employeeId).digest("hex");
    const previous = pendingLookups.get(employeeId);
    let unlock!: () => void;
    const pending = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    pendingLookups.set(employeeId, pending);
    await previous;

    try {
      const reservation = invalidCodeLimiter.reserve(employeeId);
      if (!reservation.allowed) {
        logger.warn(
          {
            event: "student_token.rate_limited",
            employeeRef,
            retryAfterMs: reservation.retryAfterMs,
          },
          "Student token requests rate limited"
        );
        return tooManyRequestsResponse(reservation.retryAfterMs);
      }

      let token: string | null;
      try {
        token = await jwtStudent(body.code);
      } catch (error) {
        reservation.release();
        throw error;
      }
      if (token) {
        reservation.release();
        return NextResponse.json({ token }, { status: 200 });
      }

      logger.warn(
        { event: "student_token.invalid_code", employeeRef },
        "Invalid student token code"
      );
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    } finally {
      unlock();
      if (pendingLookups.get(employeeId) === pending)
        pendingLookups.delete(employeeId);
    }
  },
});
