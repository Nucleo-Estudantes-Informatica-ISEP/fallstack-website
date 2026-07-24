import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { updateFaqOrder } from "@/application/services/faqService";
import { updateFaqOrderSchema } from "@/schemas/adminFaqSchema";

export const PATCH = defineHandler({
  auth: "admin",
  schema: updateFaqOrderSchema,
  handler: async ({ body }) => {
    await updateFaqOrder(body.updates);
    return NextResponse.json({ message: "FAQ order updated" });
  },
});
