import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { setStudentAvatar } from "@/application/services/studentService";
import { setStudentAvatarSchema } from "@/schemas/studentAvatarSchema";

interface StudentParams {
  code: string;
}

export const POST = defineHandler<StudentParams, typeof setStudentAvatarSchema>(
  {
    auth: "student",
    authorize: (session, params) => session.student?.code === params.code,
    schema: setStudentAvatarSchema,
    handler: async ({ body, params, session }) => {
      await setStudentAvatar(session!.id, params.code, body.url);
      return NextResponse.json({ url: body.url });
    },
  }
);
