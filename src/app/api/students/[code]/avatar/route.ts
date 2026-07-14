import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { setStudentAvatar } from "@/application/services/studentService";

interface StudentParams {
  code: string;
}

export const POST = defineHandler<StudentParams>({
  auth: "student",
  authorize: (session, params) => session.student?.code === params.code,
  handler: async ({ req, params }) => {
    const { url } = await req.json();
    if (typeof url !== "string" || !url)
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    await setStudentAvatar(params.code, url);
    return NextResponse.json({ url });
  },
});
