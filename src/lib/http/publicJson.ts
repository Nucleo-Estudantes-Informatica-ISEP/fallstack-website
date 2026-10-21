import "server-only";

import { NextResponse } from "next/server";

export function publicJson<T>(data: T) {
  return NextResponse.json(data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
