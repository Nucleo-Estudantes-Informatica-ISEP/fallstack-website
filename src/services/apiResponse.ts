import { NextResponse } from "next/server";

type ErrorStatus = 400 | 401 | 403;

export function errorResponse(error: unknown, status: ErrorStatus) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status });
}
