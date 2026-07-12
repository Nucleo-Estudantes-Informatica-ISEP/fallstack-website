import { NextRequest, NextResponse } from "next/server";

import { Session } from "@/types/Session";
import prisma from "@/lib/prisma";
import { isSaved } from "@/lib/savedStudents";
import { verifyJwt } from "@/services/authService";
import { createAdminClient } from "@/utils/supabase/admin";

interface StudentParams {
  params: Promise<{
    code: string;
  }>;
}

export async function GET(req: NextRequest, props: StudentParams) {
  const params = await props.params;

  const { code } = params;

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = verifyJwt(token) as unknown as Session | null;
  if (!decoded)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // token now encodes the company id
  const company = await prisma.company.findUnique({
    where: { id: decoded.id },
  });
  if (!company)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // fetch student as the logged user may be a company
  const student = await prisma.student.findUnique({ where: { code } });

  if (!student)
    return new NextResponse("Este perfil não existe.", { status: 404 });

  if (!(await isSaved(company.id, student.code)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!student.cv)
    return new NextResponse("O estudante não tem CV.", { status: 404 });

  const admin = createAdminClient();
  const supaPath = `distribution/cv/${student.cv}.pdf`;
  const supa = await admin.storage
    .from("cvs")
    .createSignedUrl(supaPath, 60 * 5);
  if (!supa.error && supa.data) {
    return new NextResponse(null, {
      headers: { Location: supa.data.signedUrl },
      status: 307,
    });
  }

  return NextResponse.json({ error: "CV not found" }, { status: 404 });
}
