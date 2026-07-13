import { NextRequest, NextResponse } from "next/server";

import { getStudentStats } from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";

interface StudentParams {
  params: Promise<{ code: string }>;
}

export async function GET(_: NextRequest, { params }: StudentParams) {
  if (!(await getServerSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getStudentStats((await params).code));
}
