import { NextResponse } from "next/server";

import { Email } from "@/types/Email";
import config from "@/config";
import { serverEnv } from "@/config/env.server";
import { APP_SESSION_TTL_SECONDS } from "@/config/sessionLifetime";
import { defineHandler } from "@/lib/http/server";
import { signUpEmployee } from "@/application/services/authApplicationService";
import { verifyAppSession } from "@/application/services/zitadelAuthService";
import { employeeSignUpSchema } from "@/schemas/employeeSignUpSchema";

export const POST = defineHandler({
  auth: "session",
  schema: employeeSignUpSchema,
  handler: async ({ body, req, session }) => {
    if (serverEnv.EVENT_MODE === "offseason") {
      return NextResponse.json(
        { error: "As inscrições estão encerradas." },
        { status: 403 }
      );
    }

    if (!session?.zitadelUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentToken = req.cookies.get(config.cookies.auth.name)?.value;
    const claims = currentToken ? verifyAppSession(currentToken) : null;
    const identity = claims?.sub === session.zitadelUserId ? claims : null;
    const token = await signUpEmployee({
      userId: session.id,
      zitadelUserId: session.zitadelUserId,
      email: Email.create(session.email),
      ...body,
      isNeiMember: session.neiMember,
      attendanceExpiresAt: session.attendanceExpiresAt,
      idToken: identity?.idToken,
      loginName: identity?.loginName,
    });

    const response = NextResponse.json(
      { message: "Employee signup successfully" },
      { status: 201 }
    );
    response.cookies.set(config.cookies.auth.name, token, {
      httpOnly: true,
      secure: serverEnv.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: APP_SESSION_TTL_SECONDS,
    });
    return response;
  },
});
