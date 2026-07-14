import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { toInterestMatchDto } from "@/application/dto/companyDto";
import { getInterestMatchingCompanies } from "@/application/services/companyService";

interface MatchingInterestParams {
  id: string;
}

export const GET = defineHandler<MatchingInterestParams>({
  auth: "session",
  // A user may only query their own matches; admins may query anyone's.
  authorize: (session, params) => params.id === session.id || session.isAdmin,
  handler: async ({ params }) => {
    const matches = await getInterestMatchingCompanies(params.id);
    return NextResponse.json(matches.map(toInterestMatchDto));
  },
});
