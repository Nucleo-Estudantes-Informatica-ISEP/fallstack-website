import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { getStudentStats } from "@/application/services/savedStudentService";

interface StudentParams {
  code: string;
}

export const GET = defineHandler<StudentParams>({
  auth: "session",
  handler: async ({ params }) => {
    return NextResponse.json(await getStudentStats(params.code));
  },
});
