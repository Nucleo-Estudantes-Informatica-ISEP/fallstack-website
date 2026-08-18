import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { updateCompanyInterestsForAdmin } from "@/application/services/companyService";
import { updateCompanyInterestsSchema } from "@/schemas/companyContentSchema";

interface CompanyParams {
  id: string;
}

export const PATCH = defineHandler<
  CompanyParams,
  typeof updateCompanyInterestsSchema
>({
  auth: "admin",
  schema: updateCompanyInterestsSchema,
  handler: async ({ params, body }) => {
    await updateCompanyInterestsForAdmin(params.id, body.interestIds);
    return NextResponse.json({ message: "Company interests updated" });
  },
});
