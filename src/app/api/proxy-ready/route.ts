import { NextResponse } from "next/server";

import { isShuttingDown } from "@/application/services/shutdownService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Proxy routing probe used by Traefik loadbalancer.
// Focuses on process lifecycle and graceful shutdown state rather than external
// dependencies, avoiding domain-wide blackouts on single-replica topologies.
export async function GET() {
  const stopping = isShuttingDown();
  return NextResponse.json(
    stopping ? { error: "Service unavailable" } : { status: "ready" },
    {
      status: stopping ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
