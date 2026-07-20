import { NextRequest, NextResponse } from "next/server";

import { Session } from "@/types/Session";
import { httpErrorResponse } from "@/lib/http/server";
import { verifyJwt } from "@/application/services/authService";
import { getExportCvUrl } from "@/application/services/exportService";

interface StudentParams {
  params: Promise<{ code: string }>;
}

// Not a defineHandler route: auth here is a query-string JWT (the CV export
// link), not the session cookie defineHandler's auth Strategy checks.
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
