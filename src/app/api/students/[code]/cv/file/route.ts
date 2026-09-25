import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { downloadStudentCv } from "@/application/services/studentService";

export const GET = defineHandler<{ code: string }>({
  auth: "session",
  handler: async ({ session, params }) => {
    const file = await downloadStudentCv(params.code, {
      studentCode: session!.student?.code,
      companyId: session!.employee?.company?.id,
      isAdmin: session!.adminRole !== null,
    });
    return new NextResponse(file.bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": "attachment; filename=cv.pdf",
        "Cache-Control": "private, no-store",
      },
    });
  },
});
