import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { saveStudentAsAdmin } from "@/application/services/savedStudentService";
import { saveStudentAdminSchema } from "@/schemas/saveStudentAdminSchema";

export const POST = defineHandler({
  auth: "admin",
  schema: saveStudentAdminSchema,
  handler: async ({ body }) => {
    await saveStudentAsAdmin(body.studentEmailNumber, body.companyId);
    return NextResponse.json({ message: "Student saved" });
  },
});
