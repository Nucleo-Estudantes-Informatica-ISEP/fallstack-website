import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminCompanyDto } from "@/application/dto/companyDto";
import { updateCompanyForAdmin } from "@/application/services/companyService";
import { updateAdminCompanySchema } from "@/schemas/adminCompanySchema";

interface CompanyParams {
  id: string;
}

export const PATCH = defineHandler<
  CompanyParams,
  typeof updateAdminCompanySchema
>({
  auth: "admin",
  schema: updateAdminCompanySchema,
  handler: async ({ params, body }) => {
    const company = await updateCompanyForAdmin(params.id, body);
    return NextResponse.json(toAdminCompanyDto(company));
  },
});
