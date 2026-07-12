import { NextRequest, NextResponse } from "next/server";

import { getInterestMatchingCompanies } from "@/application/services/companyService";
import getServerSession from "@/application/services/sessionService";

interface MatchingInterestParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: MatchingInterestParams
) {
  const { id: userId } = await params;

  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A user may only query their own matches; admins may query anyone's.
  if (userId !== session.id && !session.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const matches = await getInterestMatchingCompanies(userId);

  // Return only public company fields — drop the included user (email/isAdmin).
  const data = matches.map(({ company, matchingInterests }) => ({
    company: {
      id: company.id,
      name: company.name,
      tier: company.tier,
      avatar: company.avatar,
    },
    matchingInterests,
  }));

  return NextResponse.json(data);
}
