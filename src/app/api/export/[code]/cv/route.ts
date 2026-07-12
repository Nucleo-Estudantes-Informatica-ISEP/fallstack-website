import { NextRequest, NextResponse } from "next/server";

import { getExportCvUrl } from "@/application/services/exportService";
import { verifyJwt } from "@/services/authService";
import { httpErrorResponse } from "@/lib/http/server";
import { Session } from "@/types/Session";

interface StudentParams {
  params: Promise<{ code: string }>;
}

export async function GET(req: NextRequest, { params }: StudentParams) {
  const token = new URL(req.url).searchParams.get("token");
  const decoded = token
    ? (verifyJwt(token) as unknown as Session | null)
    : null;
  if (!decoded)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = await getExportCvUrl(decoded.id, (await params).code);
    return new NextResponse(null, { headers: { Location: url }, status: 307 });
  } catch (error) {
    return httpErrorResponse(error);
  }
}
