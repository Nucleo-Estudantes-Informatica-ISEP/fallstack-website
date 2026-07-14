import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toCompanyDto } from "@/application/dto/companyDto";
import {
  getCompanies,
  registerCompany,
} from "@/application/services/companyService";
import { postCompanySchema } from "@/schemas/postCompanySchema";

export const POST = defineHandler({
  auth: "session",
  schema: postCompanySchema,
  handler: async ({ session, body }) => {
    const company = await registerCompany({ userId: session!.id, ...body });
    return NextResponse.json(
      { company: toCompanyDto(company) },
      { status: 201 }
    );
  },
});

export const GET = defineHandler({
  auth: "admin",
  handler: async () => {
    return NextResponse.json((await getCompanies()).map(toCompanyDto));
  },
});
