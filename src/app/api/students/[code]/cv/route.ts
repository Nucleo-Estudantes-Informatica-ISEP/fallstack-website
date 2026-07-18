import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import {
  getStudentCv,
  setStudentCv,
} from "@/application/services/studentService";
import { cvUploadSchema } from "@/schemas/cvUploadSchema";

interface StudentParams {
  code: string;
}

export const GET = defineHandler<StudentParams>({
  auth: "session",
  handler: async ({ session, params }) => {
    const url = await getStudentCv(params.code, {
      studentCode: session!.student?.code,
      companyId: session!.employee?.company?.id,
      isAdmin: session!.isAdmin,
    });
    return NextResponse.json({ url });
  },
});

export const POST = defineHandler<StudentParams, typeof cvUploadSchema>({
  auth: "student",
  schema: cvUploadSchema,
  authorize: (session, params) => session.student?.code === params.code,
  handler: async ({ params, body }) => {
    if (!("id" in body))
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    await setStudentCv(params.code, body.id);
    return NextResponse.json({ ok: true });
  },
});
