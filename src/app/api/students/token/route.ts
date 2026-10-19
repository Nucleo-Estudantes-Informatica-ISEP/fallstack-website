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

export const POST = defineHandler({
  auth: "employee",
  schema: studentTokenSchema,
  handler: async ({ body, session }) => {
    const employeeId = session?.employee?.id;

    if (!employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rateLimitReservation = invalidCodeLimiter.reserve(employeeId);

    if (!rateLimitReservation.allowed) {
      logger.warn(
        {
          event: "student_token.rate_limited",
          employeeId,
          retryAfterMs: rateLimitReservation.retryAfterMs,
        },
        "Student token requests rate limited"
      );

      return tooManyRequestsResponse(rateLimitReservation.retryAfterMs);
    }

    const token = await jwtStudent(body.code);

    if (token) {
      rateLimitReservation.release();
      return NextResponse.json({ token }, { status: 200 });
    }

    logger.warn(
      {
        event: "student_token.invalid_code",
        employeeId,
      },
      "Invalid student token code"
    );

    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  },
});
