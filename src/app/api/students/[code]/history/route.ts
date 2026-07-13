import { NextRequest, NextResponse } from "next/server";

import { HttpError } from "@/types/HttpError";
import { toSavedStudentDto } from "@/application/dto/historyDto";
import { getStudentHistory } from "@/application/services/savedStudentService";
import getServerSession from "@/application/services/sessionService";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.student || session.student.code !== code)
    return NextResponse.json("Forbidden", { status: 403 });

  const history = await getStudentHistory(session.student.id);

  if (history instanceof HttpError)
    return NextResponse.json(history.message, { status: history.status });

  return NextResponse.json(history.map(toSavedStudentDto));
}
