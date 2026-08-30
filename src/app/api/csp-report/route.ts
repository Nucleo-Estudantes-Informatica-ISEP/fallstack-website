import { NextRequest, NextResponse } from "next/server";

/**
 *
 * Ensures the methods only work outside of production
 */
function ensureDevelopmentStage() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  return null;
}

export async function POST(request: NextRequest) {
  const blocked = ensureDevelopmentStage();
  if (blocked) return blocked; //if response is not null means this is production

  try {
    const payload = await request.json();

    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload) ||
      typeof payload["csp-report"] !== "object" ||
      payload["csp-report"] === null
    ) {
      return NextResponse.json(
        { error: "Invalid CSP report payload" },
        { status: 400 }
      );
    }

    console.warn("CSP violation report:", JSON.stringify(payload, null, 2));

    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  const blocked = ensureDevelopmentStage();

  if (blocked) {
    return blocked;
  }

  return NextResponse.json({
    status: "ok",
    environment: process.env.NODE_ENV,
    note: "Development-only CSP report endpoint.",
  });
}
