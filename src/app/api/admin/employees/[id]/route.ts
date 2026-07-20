import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import {
  deleteEmployeeForAdmin,
  updateEmployeeForAdmin,
} from "@/application/services/employeeService";
import { updateAdminEmployeeSchema } from "@/schemas/adminEmployeeSchema";

interface EmployeeParams {
  id: string;
}

export const PATCH = defineHandler<
  EmployeeParams,
  typeof updateAdminEmployeeSchema
>({
  auth: "admin",
  schema: updateAdminEmployeeSchema,
  handler: async ({ params, body }) => {
    const employee = await updateEmployeeForAdmin(params.id, body);
    return NextResponse.json(employee);
  },
});

export const DELETE = defineHandler<EmployeeParams>({
  auth: "admin",
  handler: async ({ params }) => {
    await deleteEmployeeForAdmin(params.id);
    return new NextResponse(null, { status: 204 });
  },
});
