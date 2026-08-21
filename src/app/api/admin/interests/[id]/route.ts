import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminInterestDto } from "@/application/dto/interestDto";
import {
  deleteInterestForAdmin,
  updateInterestForAdmin,
} from "@/application/services/interestService";
import { updateAdminInterestSchema } from "@/schemas/adminInterestSchema";

interface InterestParams {
  id: string;
}

export const PATCH = defineHandler<
  InterestParams,
  typeof updateAdminInterestSchema
>({
  auth: "admin",
  schema: updateAdminInterestSchema,
  handler: async ({ params, body }) => {
    const interest = await updateInterestForAdmin(params.id, body.name);
    return NextResponse.json(toAdminInterestDto(interest));
  },
});

export const DELETE = defineHandler<InterestParams>({
  auth: "admin",
  handler: async ({ params }) => {
    await deleteInterestForAdmin(params.id);
    return new NextResponse(null, { status: 204 });
  },
});
