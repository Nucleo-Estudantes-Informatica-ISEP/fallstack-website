import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { jwtStudent } from "@/application/services/studentTokenService";
import { studentTokenSchema } from "@/schemas/studentTokenSchema";

export const POST = defineHandler({
  auth: "employee",
  schema: studentTokenSchema,
  handler: async ({ body }) => {
    const token = await jwtStudent(body.code);
    if (!token)
      return NextResponse.json({ error: "Student not found" }, { status: 404 });

    return NextResponse.json({ token }, { status: 200 });
  },
});
