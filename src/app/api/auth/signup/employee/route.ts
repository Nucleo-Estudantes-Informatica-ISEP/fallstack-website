import { NextResponse } from "next/server";

import { Email } from "@/types/Email";
import config from "@/config";
import { serverEnv } from "@/config/env.server";
import { defineHandler } from "@/lib/http/server";
import { signUpEmployee } from "@/application/services/authApplicationService";
import { employeeSignUpSchema } from "@/schemas/employeeSignUpSchema";

export const POST = defineHandler({
  auth: "session",
  schema: employeeSignUpSchema,
  handler: async ({ body, session }) => {
    if (!session?.zitadelUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = await signUpEmployee({
      userId: session.id,
      zitadelUserId: session.zitadelUserId,
      email: Email.create(session.email),
      ...body,
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
      maxAge: 8 * 60 * 60,
    });
    return response;
  },
});
