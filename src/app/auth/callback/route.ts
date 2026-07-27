import { NextRequest, NextResponse } from "next/server";

import { Email } from "@/types/Email";
import { reportError } from "@/lib/logger";
import { completeOAuthSignIn } from "@/application/services/authApplicationService";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

import { sanitizeNext } from "./sanitizeNext";

// Supabase-constructed OAuth callback URL, used by the AuthNEI (registered
// as a GoTrue custom OIDC provider - see config/index.ts's authneiProvider)
// sign-in flow — exchanges the `code` query param for a session via
// exchangeCodeForSession. This is a different flow from
// app/auth/confirm/route.ts (which only handles OTP email-link
// confirmation), but lives alongside it outside the (auth)/api conventions
// for the same reason: Supabase itself constructs this URL.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      try {
        const destination = await completeOAuthSignIn({
          id: data.user.id,
          email: Email.create(data.user.email),
          fallback: next,
        });
        return NextResponse.redirect(new URL(destination, request.url));
      } catch (err) {
        reportError(
          err,
          { operation: "authnei_oauth_callback" },
          "Failed to complete AuthNEI sign-in"
        );
      }
    }
  }

  // Error handling — same fallback page as app/auth/confirm/route.ts
  return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
}
