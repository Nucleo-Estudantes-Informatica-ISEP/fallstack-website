import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import {
  toStudentDto,
  toStudentSummaryDto,
} from "@/application/dto/studentDto";
import {
  getStudentProfile,
  updateStudent,
} from "@/application/services/studentService";
import { patchStudentSchema } from "@/schemas/patchStudentSchema";

interface StudentParams {
  code: string;
}

export const GET = defineHandler<StudentParams>({
  auth: "session",
  handler: async ({ session, params }) => {
    const student = await getStudentProfile(params.code, {
      studentCode: session!.student?.code,
      companyId: session!.employee?.company?.id,
      isAdmin: session!.adminRole !== null,
    });
    return NextResponse.json(toStudentDto(student));
  },
});

export const PATCH = defineHandler<StudentParams, typeof patchStudentSchema>({
  auth: "session",
  schema: patchStudentSchema,
  authorize: (session, params) => session.student?.code === params.code,
  handler: async ({ session, params, body }) => {
    return NextResponse.json(
      toStudentSummaryDto(await updateStudent(session!.id, params.code, body))
    );
  },
});
