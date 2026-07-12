import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";
import { ZodError } from "zod";

import { signInSchema } from "@/schemas/signInSchema";

export async function POST(req: Request) {
  try {
    const requestBody = await req.json();
    const body = signInSchema.parse(requestBody);
    const { email, password } = body;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error)
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );

    return NextResponse.json(
      { message: "Sign in successfully" },
      { status: 200 }
    );
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error: e.issues }, { status: 400 });

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
