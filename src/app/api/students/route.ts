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

    // The verified AuthNEI name wins. Without one the student must provide a
    // name: it is public and read-only afterwards, so never derive it from the
    // email address.
    const name = (studentSession.authName || body.name || "").slice(0, 100);
    if (!name)
      return NextResponse.json(
        { error: "Indica o teu nome para criar o perfil." },
        { status: 400 }
      );

    return NextResponse.json(
      toStudentSummaryDto(
        await createStudentProfile(studentSession.id, { ...body, name })
      ),
      { status: 201 }
    );
  },
});
