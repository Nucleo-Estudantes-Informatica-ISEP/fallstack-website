import "server-only";

import { NextResponse } from "next/server";

import { HttpError } from "@/types/HttpError";

export const httpErrorResponse = (error: unknown) =>
  error instanceof HttpError
    ? NextResponse.json({ error: error.message }, { status: error.status })
    : NextResponse.json({ error: "Something went wrong" }, { status: 500 });
