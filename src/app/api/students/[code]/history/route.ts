import { NextResponse } from "next/server";

import { HttpError } from "@/types/HttpError";
import { defineHandler } from "@/lib/http/server";
import { toSavedStudentDto } from "@/application/dto/historyDto";
import { getStudentHistory } from "@/application/services/savedStudentService";

interface StudentParams {
  code: string;
}

export const GET = defineHandler<StudentParams>({
  auth: "student",
  authorize: (session, params) => session.student?.code === params.code,
  handler: async ({ session }) => {
    const history = await getStudentHistory(session!.student!.id);

    if (history instanceof HttpError)
      return NextResponse.json(history.message, { status: history.status });

    return NextResponse.json(history.map(toSavedStudentDto));
  },
});
