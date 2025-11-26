import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { z } from "zod";

const requestResetSchema = z.object({
  email: z.string().email(),
});

const confirmResetSchema = z.object({
  password: z.string().min(8),
  code: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Use the anon key for sending the password reset email
    // This ensures the flow behaves like a client-side request and avoids some security scanner issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check if this is a password reset request (has email)
    if (body.email) {
      const parsed = requestResetSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid email" },
          { status: 400 }
        );
      }

      const { email } = parsed.data;

      const redirectTo = new URL(
        "/password-reset/confirm",
        req.nextUrl.origin,
      ).toString();

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) {
        //@ts-ignore
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      //@ts-ignore
      return NextResponse.json(
        { message: "Password reset email sent" },
        { status: 200 }
      );
    }

    // Otherwise, this is a password update (user is authenticated via reset link)
    const parsed = confirmResetSchema.safeParse(body);
    if (!parsed.success) {
      //@ts-ignore
      return NextResponse.json(
        { error: "Invalid password or code" },
        { status: 400 }
      );
    }

    const { password, code } = parsed.data;

    // Exchange the recovery code for a session so updateUser succeeds
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      //@ts-ignore
      return NextResponse.json(
        { error: exchangeError.message || "Auth session missing" },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      //@ts-ignore
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    //@ts-ignore
    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (e) {
    console.error(e);
    //@ts-ignore
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
