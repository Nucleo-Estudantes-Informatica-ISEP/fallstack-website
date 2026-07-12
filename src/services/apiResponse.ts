import { NextResponse } from "next/server";

type ErrorStatus = 400 | 401 | 403;

export function errorResponse(error: unknown, status: ErrorStatus) {
  return NextResponse.json({ error }, { status });
}
