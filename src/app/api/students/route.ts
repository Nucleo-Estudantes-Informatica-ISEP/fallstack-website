import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toStudentSummaryDto } from "@/application/dto/studentDto";
import { createStudentProfile } from "@/application/services/studentService";
import { postStudentSchema } from "@/schemas/postStudentSchema";

export const POST = defineHandler({
  auth: "session",
  schema: postStudentSchema,
  authorize: (session) => session.role === "STUDENT",
  handler: async ({ session, body }) => {
    if (session!.student)
      return NextResponse.json(
        { error: "Já tens um perfil criado." },
        { status: 403 }
      );

    return NextResponse.json(
      toStudentSummaryDto(await createStudentProfile(session!.id, body)),
      { status: 201 }
    );
  },
});
