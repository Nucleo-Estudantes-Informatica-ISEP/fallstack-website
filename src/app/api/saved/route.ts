import { NextRequest, NextResponse } from "next/server";

import { httpErrorResponse } from "@/lib/http/server";
import { errorResponse } from "@/services/apiResponse";
import { verifyJwt } from "@/services/authService";
import {
  saveStudent,
  updateSavedStudentComment,
} from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";
import { savedCommentSchema, saveSchema } from "@/schemas/saveSchema";

function studentCodeFromToken(token: string | undefined) {
  if (!token) return undefined;
  const decoded = verifyJwt(token) as unknown as { code: string } | null;
  return decoded?.code;
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "EMPLOYEE" || !session.employee?.company)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = savedCommentSchema.safeParse(await req.json());
  if (!parsed.success) return errorResponse(parsed.error, 400);
  try {
    const { studentId, comment } = parsed.data;
    await updateSavedStudentComment(
      studentId,
      session.employee.company.id,
      comment
    );
    return NextResponse.json({ comment });
  } catch (error) {
    return httpErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.employee?.company)
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  const parsed = saveSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  const code = studentCodeFromToken(parsed.data.token);
  if (!code)
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  try {
    await saveStudent({
      studentCode: code,
      employeeId: session.employee.id,
      companyId: session.employee.company.id,
      comment: parsed.data.comment,
      allowDuplicate: session.isAdmin,
      completeBoothAction: true,
    });
    return NextResponse.json({ message: "Student scanned" }, { status: 201 });
  } catch (error) {
    return httpErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "EMPLOYEE" || !session.employee)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = saveSchema.safeParse(await req.json());
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const code = studentCodeFromToken(parsed.data.token);
  if (!code)
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  try {
    return NextResponse.json(
      await saveStudent({
        studentCode: code,
        employeeId: session.employee.id,
        companyId: session.employee.company.id,
        comment: parsed.data.comment,
      })
    );
  } catch (error) {
    return httpErrorResponse(error);
  }
}
