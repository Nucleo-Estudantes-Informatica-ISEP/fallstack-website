import { NextResponse } from "next/server";

import getServerSession from "@/application/services/sessionService";

export async function GET() {
  const session = await getServerSession();
  if (!session) return new NextResponse(null, { status: 401 });
  return NextResponse.json(session, { status: 200 });
}
