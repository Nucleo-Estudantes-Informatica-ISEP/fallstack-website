import { NextResponse } from "next/server";

import { isReady } from "@/application/services/readinessService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Health probes intentionally skip defineHandler and session resolution. This
// endpoint must remain usable when authentication or the database is unavailable.
export async function GET() {
  const ready = await isReady();
  return NextResponse.json(
    ready ? { status: "ready" } : { error: "Service unavailable" },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
