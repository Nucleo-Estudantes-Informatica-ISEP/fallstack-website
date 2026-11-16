import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { streamStudentCv } from "@/application/services/studentService";

export const GET = defineHandler<{ code: string }>({
  auth: "session",
  handler: async ({ req, session, params }) => {
    const file = await streamStudentCv(
      params.code,
      {
        studentCode: session!.student?.code,
        companyId: session!.employee?.company?.id,
        isAdmin: session!.adminRole !== null,
      },
      req.signal
    );
    return new NextResponse(file.body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": "attachment; filename=cv.pdf",
        ...(file.contentLength !== undefined && {
          "Content-Length": String(file.contentLength),
        }),
        "Cache-Control": "private, no-store",
      },
    });
  },
});
