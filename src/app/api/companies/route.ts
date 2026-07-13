import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { httpErrorResponse } from "@/lib/http/server";
import { toCompanyDto } from "@/application/dto/companyDto";
import {
  getCompanies,
  registerCompany,
} from "@/application/services/companyService";
import getServerSession from "@/application/services/sessionService";
import { postCompanySchema } from "@/schemas/postCompanySchema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = postCompanySchema.parse(await req.json());
    const company = await registerCompany({ userId: session.id, ...body });
    return NextResponse.json(
      { company: toCompanyDto(company) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 });
    return httpErrorResponse(error);
  }
}

export async function GET() {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json((await getCompanies()).map(toCompanyDto));
}
