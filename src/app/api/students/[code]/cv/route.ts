import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { z } from "zod";

import config from "@/config";
import { completeAction } from "@/lib/completeAction";
import prisma from "@/lib/prisma";
import { isSaved } from "@/lib/savedStudents";
import getServerSession from "@/services/getServerSession";

const schema = z.union([
  z.object({ uploadId: z.string().uuid() }), // Firebase flow
  z.object({ id: z.string().uuid() }), // Supabase flow
]);

interface StudentParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(_: NextRequest, props: StudentParams) {
  const params = await props.params;

  const { code } = params;

  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // fetch student as the logged user may be a company
  const student = await prisma.student.findUnique({ where: { code } });

  if (!student)
    return NextResponse.json({ error: "CV not found" }, { status: 404 });

  // Only the CV owner, a company that saved this student, or an admin.
  // Unauthorized -> 404 (don't reveal the student/CV exists).
  const isOwner = session.student?.code === code;
  const isSavingCompany =
    !!session.employee?.company &&
    (await isSaved(session.employee.company.id, code));

  if (!isOwner && !isSavingCompany && !session.isAdmin)
    return NextResponse.json({ error: "CV not found" }, { status: 404 });

  if (!student.cv)
    return NextResponse.json({ error: "CV not found" }, { status: 404 });

  const admin = createAdminClient();
  // Try Supabase first
  const supaPath = `distribution/cv/${student.cv}.pdf`;
  const supa = await admin.storage
    .from("cvs")
    .createSignedUrl(supaPath, 60 * 5);
  if (!supa.error && supa.data) {
    return NextResponse.json({ url: supa.data.signedUrl });
  }

  // If not in Supabase, return 404 as legacy storage is removed
  return NextResponse.json({ error: "CV not found" }, { status: 404 });
}

export async function POST(req: NextRequest, props: StudentParams) {
  const params = await props.params;

  const { code } = params;

  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role !== "STUDENT" || session.student?.code !== code)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json(parsed.error, { status: 400 });

  if ("id" in parsed.data) {
    // Supabase flow
    const { id } = parsed.data;
    const admin = createAdminClient();
    const path = `distribution/cv/${id}.pdf`;
    const check = await admin.storage.from("cvs").createSignedUrl(path, 60);
    if (check.error)
      return NextResponse.json({ error: "Invalid upload id" }, { status: 400 });

    await prisma.student.update({ where: { code }, data: { cv: id } });
  } else {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await completeAction(
    session.student.code,
    config.constants.actionNames.uploadCv
  );

  return NextResponse.json({ ok: true });
}
