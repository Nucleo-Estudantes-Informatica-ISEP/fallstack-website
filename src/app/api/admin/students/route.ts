import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminStudentDto } from "@/application/dto/studentDto";
import {
  createStudentForAdmin,
  listStudentsForAdmin,
} from "@/application/services/studentService";
import { createAdminStudentSchema } from "@/schemas/adminStudentSchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listStudentsForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toAdminStudentDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminStudentSchema,
  handler: async ({ body }) => {
    const student = await createStudentForAdmin(body);
    return NextResponse.json(student, { status: 201 });
  },
});
