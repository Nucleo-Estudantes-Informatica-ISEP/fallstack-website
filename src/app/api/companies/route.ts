import { NextResponse } from "next/server";

import { serverEnv } from "@/config/env.server";
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
    if (serverEnv.EVENT_MODE === "offseason") {
      return NextResponse.json(
        { error: "As inscrições estão encerradas." },
        { status: 403 }
      );
    }

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
