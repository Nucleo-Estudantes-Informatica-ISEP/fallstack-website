import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { updateCompanyRankBoard } from "@/application/services/companyService";
import { updateCompanyRankBoardSchema } from "@/schemas/companyRankSchema";

export const PATCH = defineHandler({
  auth: "admin",
  schema: updateCompanyRankBoardSchema,
  handler: async ({ body }) => {
    await updateCompanyRankBoard(body.updates);
    return NextResponse.json({ message: "Rank board updated" });
  },
});
