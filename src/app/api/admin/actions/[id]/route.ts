import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toActionDto } from "@/application/dto/actionDto";
import { updateActionForAdmin } from "@/application/services/actionService";
import { updateAdminActionSchema } from "@/schemas/adminActionSchema";

interface ActionParams {
  id: string;
}

export const PATCH = defineHandler<
  ActionParams,
  typeof updateAdminActionSchema
>({
  auth: "admin",
  schema: updateAdminActionSchema,
  handler: async ({ params, body }) => {
    const action = await updateActionForAdmin(params.id, body);
    return NextResponse.json(toActionDto(action));
  },
});
