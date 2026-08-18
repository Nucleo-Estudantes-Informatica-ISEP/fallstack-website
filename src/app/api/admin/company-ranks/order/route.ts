import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { updateCompanyRankOrder } from "@/application/services/companyRankService";
import { updateCompanyRankOrderSchema } from "@/schemas/companyRankSchema";

export const PATCH = defineHandler({
  auth: "admin",
  schema: updateCompanyRankOrderSchema,
  handler: async ({ body }) => {
    await updateCompanyRankOrder(body.updates);
    return NextResponse.json({ message: "Company rank order updated" });
  },
});
