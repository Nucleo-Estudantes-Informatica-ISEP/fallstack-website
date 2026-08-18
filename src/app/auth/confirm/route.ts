import { NextRequest, NextResponse } from "next/server";

// Legacy Supabase email/OTP links may still exist in old test mailboxes. The
// application no longer verifies those links: credentials and recovery are
// owned by AuthNEI/ZITADEL.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
}
