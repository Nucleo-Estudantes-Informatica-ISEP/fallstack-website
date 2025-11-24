import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const requestResetSchema = z.object({
  email: z.string().email(),
});

const confirmResetSchema = z.object({
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();
    // Check if this is a password reset request (has email)
    if (body.email) {
      const parsed = requestResetSchema.safeParse(body);
      if (!parsed.success) {
        //@ts-ignore
        return NextResponse.json(
          { error: "Invalid email" },
          { status: 400 }
        );
      }

      const { email } = parsed.data;



      const { data, error } = await supabase.auth.resetPasswordForEmail(email)

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
        { error: "Invalid password" },
        { status: 400 }
      );
    }

    const { password } = parsed.data;

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
