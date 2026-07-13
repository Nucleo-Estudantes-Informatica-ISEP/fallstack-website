import { NextRequest, NextResponse } from "next/server";

import getServerSession from "@/application/services/sessionService";
import { setStudentAvatar } from "@/application/services/studentService";

interface StudentParams {
  params: Promise<{ code: string }>;
}

export async function POST(req: NextRequest, { params }: StudentParams) {
  const { code } = await params;
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "STUDENT" || session.student?.code !== code)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { url } = await req.json();
  if (typeof url !== "string" || !url)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await setStudentAvatar(code, url);
  return NextResponse.json({ url });
}
