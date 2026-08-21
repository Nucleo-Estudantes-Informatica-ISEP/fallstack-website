import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toCompanyRosterDto } from "@/application/dto/companyDto";
import { getActiveCompanies } from "@/application/services/companyService";
import { resolveLanguage } from "@/domain/i18n/translations";

export const GET = defineHandler({
  auth: "public",
  handler: async ({ req }) => {
    const companies = await getActiveCompanies();
    const language = resolveLanguage(
      req.nextUrl.searchParams.get("lang") ?? req.headers.get("accept-language")
    );
    return NextResponse.json(
      companies.map((company) => toCompanyRosterDto(company, language))
    );
  },
});
