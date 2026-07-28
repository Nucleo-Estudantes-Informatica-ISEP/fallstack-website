import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminEmployeeDto } from "@/application/dto/employeeDto";
import {
  createEmployeeForAdmin,
  listEmployeesForAdmin,
} from "@/application/services/employeeService";
import { createAdminEmployeeSchema } from "@/schemas/adminEmployeeSchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async ({ req }) => {
    const params = req.nextUrl.searchParams;
    const { items, totalCount } = await listEmployeesForAdmin({
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 20,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") === "desc" ? "desc" : "asc",
      search: params.get("q") ?? undefined,
    });
    return NextResponse.json({
      items: items.map(toAdminEmployeeDto),
      totalCount,
    });
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminEmployeeSchema,
  handler: async ({ body }) => {
    const employee = await createEmployeeForAdmin(body);
    return NextResponse.json(employee, { status: 201 });
  },
});
