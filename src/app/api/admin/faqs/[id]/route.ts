import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminFaqDto } from "@/application/dto/faqDto";
import {
  deleteFaqEntryForAdmin,
  updateFaqEntryForAdmin,
} from "@/application/services/faqService";
import { updateAdminFaqSchema } from "@/schemas/adminFaqSchema";

interface FaqParams {
  id: string;
}

export const PATCH = defineHandler<FaqParams, typeof updateAdminFaqSchema>({
  auth: "admin",
  schema: updateAdminFaqSchema,
  handler: async ({ params, body }) => {
    const faq = await updateFaqEntryForAdmin(params.id, body);
    return NextResponse.json(toAdminFaqDto(faq));
  },
});

export const DELETE = defineHandler<FaqParams>({
  auth: "admin",
  handler: async ({ params }) => {
    await deleteFaqEntryForAdmin(params.id);
    return new NextResponse(null, { status: 204 });
  },
});
