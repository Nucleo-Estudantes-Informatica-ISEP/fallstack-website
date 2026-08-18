import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { updateCompanyProfileForAdmin } from "@/application/services/companyService";
import { updateCompanyProfileSchema } from "@/schemas/companyContentSchema";

interface CompanyParams {
  id: string;
}

export const PATCH = defineHandler<
  CompanyParams,
  typeof updateCompanyProfileSchema
>({
  auth: "admin",
  schema: updateCompanyProfileSchema,
  handler: async ({ params, body }) => {
    await updateCompanyProfileForAdmin(params.id, body);
    return NextResponse.json({ message: "Company profile updated" });
  },
});
