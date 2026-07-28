import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminAccountDto } from "@/application/dto/adminAccountDto";
import {
  deleteAdminAccount,
  updateAdminAccount,
} from "@/application/services/adminAccountService";
import { updateAdminAccountSchema } from "@/schemas/adminAccountSchema";

interface AdminAccountParams {
  id: string;
}

export const PATCH = defineHandler<
  AdminAccountParams,
  typeof updateAdminAccountSchema
>({
  auth: "superadmin",
  schema: updateAdminAccountSchema,
  handler: async ({ params, body }) => {
    const admin = await updateAdminAccount(params.id, body);
    return NextResponse.json(toAdminAccountDto(admin));
  },
});

export const DELETE = defineHandler<AdminAccountParams>({
  auth: "superadmin",
  handler: async ({ params }) => {
    await deleteAdminAccount(params.id);
    return new NextResponse(null, { status: 204 });
  },
});
