import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { httpErrorResponse } from "@/server/http/httpErrorResponse";
import getServerSession from "@/application/services/sessionService";
import { createStudentProfile } from "@/application/services/studentService";
import { postStudentSchema } from "@/schemas/postStudentSchema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "STUDENT")
      return NextResponse.json({ error: "Invalid role." }, { status: 403 });
    if (session.student)
      return NextResponse.json(
        { error: "Já tens um perfil criado." },
        { status: 403 }
      );

    const body = postStudentSchema.parse(await req.json());
    return NextResponse.json(await createStudentProfile(session.id, body), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return httpErrorResponse(error);
  }
}
