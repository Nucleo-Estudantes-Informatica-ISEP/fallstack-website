import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminCompanyRankDto } from "@/application/dto/companyRankDto";
import {
  deleteCompanyRankForAdmin,
  updateCompanyRankForAdmin,
} from "@/application/services/companyRankService";
import { updateAdminCompanyRankSchema } from "@/schemas/companyRankSchema";

interface CompanyRankParams {
  id: string;
}

export const PATCH = defineHandler<
  CompanyRankParams,
  typeof updateAdminCompanyRankSchema
>({
  auth: "admin",
  schema: updateAdminCompanyRankSchema,
  handler: async ({ params, body }) => {
    const rank = await updateCompanyRankForAdmin(params.id, body);
    return NextResponse.json(toAdminCompanyRankDto(rank));
  },
});

export const DELETE = defineHandler<CompanyRankParams>({
  auth: "admin",
  handler: async ({ params }) => {
    await deleteCompanyRankForAdmin(params.id);
    return new NextResponse(null, { status: 204 });
  },
});
