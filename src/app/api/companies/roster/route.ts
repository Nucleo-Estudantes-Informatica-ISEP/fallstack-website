import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toCompanyRosterDto } from "@/application/dto/companyDto";
import { getActiveCompanies } from "@/application/services/companyService";

export const GET = defineHandler({
  auth: "public",
  handler: async () => {
    const companies = await getActiveCompanies();
    return NextResponse.json(companies.map(toCompanyRosterDto));
  },
});
