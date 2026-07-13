import { NextResponse } from "next/server";

import { toSessionDto } from "@/application/dto/sessionDto";
import getServerSession from "@/application/services/sessionService";

export async function GET() {
  const session = await getServerSession();
  if (!session) return new NextResponse(null, { status: 401 });
  return NextResponse.json(toSessionDto(session), { status: 200 });
}
