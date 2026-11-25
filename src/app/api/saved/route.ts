import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import {
  saveStudent,
  updateSavedStudentComment,
} from "@/application/services/savedStudentService";
import { studentCodeFromPreview } from "@/application/services/studentTokenService";
import { savedCommentSchema, saveSchema } from "@/schemas/saveSchema";

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
    const code = studentCodeFromPreview(
      body.token,
      session!.employee!.company.id
    );
    if (!code)
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    await saveStudent({
      studentCode: code,
      actorId: session!.id,
      employeeId: session!.employee!.id,
      companyId: session!.employee!.company!.id,
      comment: body.comment,
      allowDuplicate: session!.adminRole !== null,
      completeBoothAction: true,
    });
    return NextResponse.json({ message: "Student scanned" }, { status: 201 });
  },
});

export const PATCH = defineHandler({
  auth: "employee",
  schema: saveSchema,
  handler: async ({ session, body }) => {
    const code = studentCodeFromPreview(
      body.token,
      session!.employee!.company.id
    );
    if (!code)
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    await saveStudent({
      studentCode: code,
      actorId: session!.id,
      employeeId: session!.employee!.id,
      companyId: session!.employee!.company!.id,
      comment: body.comment,
    });
    return NextResponse.json({ message: "Student saved" });
  },
});
