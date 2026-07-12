import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ErrorStatus = 400 | 401 | 403;

export function errorResponse(error: unknown, status: ErrorStatus) {
  const payload =
    error instanceof ZodError
      ? error.issues
      : error instanceof Error
        ? error.message
        : String(error);
  return NextResponse.json({ error: payload }, { status });
}
