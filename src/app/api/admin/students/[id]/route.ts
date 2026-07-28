import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import {
  deleteStudentForAdmin,
  updateStudentForAdmin,
} from "@/application/services/studentService";
import { updateAdminStudentSchema } from "@/schemas/adminStudentSchema";

interface StudentParams {
  id: string;
}

export const PATCH = defineHandler<
  StudentParams,
  typeof updateAdminStudentSchema
>({
  auth: "admin",
  schema: updateAdminStudentSchema,
  handler: async ({ params, body }) => {
    const student = await updateStudentForAdmin(params.id, body);
    return NextResponse.json(student);
  },
});

export const DELETE = defineHandler<StudentParams>({
  auth: "admin",
  handler: async ({ params }) => {
    await deleteStudentForAdmin(params.id);
    return new NextResponse(null, { status: 204 });
  },
});
