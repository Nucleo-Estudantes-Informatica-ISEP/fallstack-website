import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";

interface StudentParams {
  params: Promise<{
    code: string;
  }>;
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
  const url = typeof body?.url === "string" ? (body.url as string) : null;
  if (!url) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  await prisma.student.update({
    where: { code },
    data: { avatar: url },
  });

  return NextResponse.json({ url });
}
