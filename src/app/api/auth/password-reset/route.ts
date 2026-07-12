import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { reportError } from "@/lib/logger";

import { createClient } from "@supabase/supabase-js";

const requestResetSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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
