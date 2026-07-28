import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { signUpUser } from "@/application/services/authApplicationService";
import { signUpSchema } from "@/schemas/signUpSchema";

export const POST = defineHandler({
  auth: "public",
  schema: signUpSchema,
  handler: async ({ body }) => {
    const { requiresEmailConfirmation } = await signUpUser({
      email: body.email,
      password: body.password,
      role: "STUDENT",
    });
    return NextResponse.json(
      { message: "Signup successfully", requiresEmailConfirmation },
      { status: 201 }
    );
  },
});
