import { NextRequest, NextResponse } from "next/server";

import { errorResponse } from "@/services/apiResponse";
import { httpErrorResponse } from "@/server/http/httpErrorResponse";
import getServerSession from "@/application/services/sessionService";
import {
  getStudentProfile,
  updateStudent,
} from "@/application/services/studentService";
import { patchStudentSchema } from "@/schemas/patchStudentSchema";

interface StudentProps {
  params: Promise<{ code: string }>;
}

export async function GET(_: NextRequest, { params }: StudentProps) {
  const session = await getServerSession();
  if (!session) return errorResponse("Unauthorized", 401);
  try {
    const student = await getStudentProfile((await params).code, {
      studentCode: session.student?.code,
      companyId: session.employee?.company?.id,
      isAdmin: session.isAdmin,
    });
    return NextResponse.json(student);
  } catch (error) {
    return httpErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: StudentProps) {
  const session = await getServerSession();
  if (!session) return errorResponse("Unauthorized", 401);
  const { code } = await params;
  if (!session.student || session.student.code !== code)
    return errorResponse("Forbidden", 403);
  const parsed = patchStudentSchema.safeParse(await req.json());
  if (!parsed.success) return errorResponse(parsed.error, 400);
  return NextResponse.json(await updateStudent(session.id, code, parsed.data));
}
