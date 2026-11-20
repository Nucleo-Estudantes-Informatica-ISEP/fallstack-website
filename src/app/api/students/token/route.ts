import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { serverEnv } from "@/config/env.server";
import { defineHandler } from "@/lib/http/server";
import logger from "@/lib/logger";
import { rateLimitResponse } from "@/lib/rateLimit";
import { checkRateLimit } from "@/application/services/rateLimitService";
import {
  jwtStudent,
  studentPreviewCookieName,
  studentPreviewTtlSeconds,
} from "@/application/services/studentTokenService";
import { studentTokenSchema } from "@/schemas/studentTokenSchema";

const invalidCodeBudget = { windowMs: 60_000, max: 5 };

export const POST = defineHandler({
  auth: "employee",
  schema: studentTokenSchema,
  handler: async ({ body, session }) => {
    const { id, company } = session!.employee!;
    if (!id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const reservation = { id: randomUUID() };
    const decision = await checkRateLimit("student_token", id, {
      ...invalidCodeBudget,
      reservation,
    });
    const release = () =>
      checkRateLimit("student_token", id, {
        ...invalidCodeBudget,
        reservation: { ...reservation, release: true },
      });

    const employeeRef = createHash("sha256").update(id).digest("hex");
    if (decision.status === "limited")
      logger.warn(
        { event: "student_token.rate_limited", employeeRef },
        "Student token requests rate limited"
      );
    const blocked = rateLimitResponse(decision);
    if (blocked) return blocked;

    const preview = await jwtStudent(
      "code" in body ? body.code : body,
      company.id
    ).catch(async (error: unknown) => {
      await release();
      throw error;
    });
    if (preview) {
      await release();
      const response = NextResponse.json(preview, {
        headers: { "Cache-Control": "private, no-store" },
      });
      response.cookies.set(studentPreviewCookieName, preview.token, {
        path: `/student/${encodeURIComponent(preview.code)}/preview`,
        maxAge: studentPreviewTtlSeconds,
        httpOnly: true,
        sameSite: "strict",
        secure: serverEnv.NODE_ENV === "production",
      });
      return response;
    }

    logger.warn(
      { event: "student_token.invalid_code", employeeRef },
      "Invalid student token code"
    );
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  },
});
