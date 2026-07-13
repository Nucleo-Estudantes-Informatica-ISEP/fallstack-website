import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { reportError } from "@/lib/logger";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

const requestResetSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Shared SSR/browser clients both use PKCE and persist its verifier in cookies.
    const supabase = await createSupabaseServerClient();

    const parsed = requestResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const redirectTo = new URL(
      "/password-reset/confirm",
      req.nextUrl.origin
    ).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Password reset email sent" },
      { status: 200 }
    );
  } catch (e) {
    reportError(
      e,
      {
        operation: "password_reset",
        route: "/api/auth/password-reset",
        method: "POST",
      },
      "Password reset failed"
    );
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
