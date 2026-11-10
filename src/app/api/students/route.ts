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
    const studentSession = session!;
    if (studentSession.student)
      return NextResponse.json(
        { error: "Já tens um perfil criado." },
        { status: 403 }
      );

    const name = (
      studentSession.authName ||
      body.name ||
      studentSession.email.split("@")[0] ||
      "Estudante"
    ).slice(0, 100);

    return NextResponse.json(
      toStudentSummaryDto(
        await createStudentProfile(studentSession.id, { ...body, name })
      ),
      { status: 201 }
    );
  },
});
