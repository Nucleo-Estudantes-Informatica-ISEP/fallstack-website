import { NextRequest, NextResponse } from "next/server";

import { httpErrorResponse } from "@/lib/http/server";
import getServerSession from "@/application/services/sessionService";
import {
  getStudentCv,
  setStudentCv,
} from "@/application/services/studentService";
import { cvUploadSchema } from "@/schemas/cvUploadSchema";

interface StudentParams {
  params: Promise<{ code: string }>;
}

export async function GET(_: NextRequest, { params }: StudentParams) {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const url = await getStudentCv((await params).code, {
      studentCode: session.student?.code,
      companyId: session.employee?.company?.id,
      isAdmin: session.isAdmin,
    });
    return NextResponse.json({ url });
  } catch (error) {
    return httpErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: StudentParams) {
  const { code } = await params;
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "STUDENT" || session.student?.code !== code)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = cvUploadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error, { status: 400 });
  if (!("id" in parsed.data))
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    await setStudentCv(code, parsed.data.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error);
  }
}
