import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toAdminCompanyDto } from "@/application/dto/companyDto";
import {
  createCompanyForAdmin,
  listCompaniesForAdmin,
} from "@/application/services/companyService";
import { createAdminCompanySchema } from "@/schemas/adminCompanySchema";

export const GET = defineHandler({
  auth: "admin",
  handler: async () => {
    const companies = await listCompaniesForAdmin();
    return NextResponse.json(companies.map(toAdminCompanyDto));
  },
});

export const POST = defineHandler({
  auth: "admin",
  schema: createAdminCompanySchema,
  handler: async ({ body }) => {
    const company = await createCompanyForAdmin(body);
    return NextResponse.json(toAdminCompanyDto(company), { status: 201 });
  },
});
