import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { signUpEmployee } from "@/application/services/authApplicationService";
import { employeeSignUpSchema } from "@/schemas/employeeSignUpSchema";

export const POST = defineHandler({
  auth: "public",
  schema: employeeSignUpSchema,
  handler: async ({ body }) => {
    await signUpEmployee(body);
    return NextResponse.json(
      { message: "Employee signup successfully" },
      { status: 201 }
    );
  },
});
