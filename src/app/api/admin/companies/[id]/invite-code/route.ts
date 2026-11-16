import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { rotateCompanyInviteCode } from "@/application/services/companyInviteService";

interface CompanyParams {
  id: string;
}

export const POST = defineHandler<CompanyParams>({
  auth: "admin",
  handler: async ({ params }) => {
    const result = await rotateCompanyInviteCode(params.id);
    return NextResponse.json(result, { status: 201 });
  },
});
