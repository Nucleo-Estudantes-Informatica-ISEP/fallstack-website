import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { updateCompanyDisplayStyleForAdmin } from "@/application/services/companyService";
import { updateCompanyDisplayStyleSchema } from "@/schemas/companyContentSchema";

interface CompanyParams {
  id: string;
}

export const PATCH = defineHandler<
  CompanyParams,
  typeof updateCompanyDisplayStyleSchema
>({
  auth: "admin",
  schema: updateCompanyDisplayStyleSchema,
  handler: async ({ params, body }) => {
    await updateCompanyDisplayStyleForAdmin(params.id, body);
    return NextResponse.json({ message: "Company display style updated" });
  },
});
