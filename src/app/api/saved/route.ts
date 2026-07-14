import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { verifyJwt } from "@/services/authService";
import {
  saveStudent,
  updateSavedStudentComment,
} from "@/application/services/savedStudentService";
import { savedCommentSchema, saveSchema } from "@/schemas/saveSchema";

function studentCodeFromToken(token: string | undefined) {
  if (!token) return undefined;
  const decoded = verifyJwt(token) as unknown as { code: string } | null;
  return decoded?.code;
}

export const PUT = defineHandler({
  auth: "employee",
  schema: savedCommentSchema,
  handler: async ({ session, body }) => {
    const { studentId, comment } = body;
    await updateSavedStudentComment(
      studentId,
      session!.employee!.company!.id,
      comment
    );
    return NextResponse.json({ comment });
  },
});

export const POST = defineHandler({
  auth: "employee",
  schema: saveSchema,
  handler: async ({ session, body }) => {
    const code = studentCodeFromToken(body.token);
    if (!code)
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    await saveStudent({
      studentCode: code,
      employeeId: session!.employee!.id,
      companyId: session!.employee!.company!.id,
      comment: body.comment,
      allowDuplicate: session!.isAdmin,
      completeBoothAction: true,
    });
    return NextResponse.json({ message: "Student scanned" }, { status: 201 });
  },
});

export const PATCH = defineHandler({
  auth: "employee",
  schema: saveSchema,
  handler: async ({ session, body }) => {
    const code = studentCodeFromToken(body.token);
    if (!code)
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    await saveStudent({
      studentCode: code,
      employeeId: session!.employee!.id,
      companyId: session!.employee!.company!.id,
      comment: body.comment,
    });
    return NextResponse.json({ message: "Student saved" });
  },
});
