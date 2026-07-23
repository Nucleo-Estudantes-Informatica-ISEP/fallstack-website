import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { updateCompanyTierBoard } from "@/application/services/companyService";
import { updateCompanyTierBoardSchema } from "@/schemas/adminCompanySchema";

export const PATCH = defineHandler({
  auth: "admin",
  schema: updateCompanyTierBoardSchema,
  handler: async ({ body }) => {
    await updateCompanyTierBoard(body.updates);
    return NextResponse.json({ message: "Tier board updated" });
  },
});
