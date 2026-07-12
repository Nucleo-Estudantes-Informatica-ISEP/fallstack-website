import { NextResponse } from "next/server";
import { ZodError } from "zod";

import prisma from "@/lib/prisma";
import { signUpSchema } from "@/schemas/signUpSchema";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    // validate the request body against the schema
    const requestBody = await req.json();
    const body = signUpSchema.parse(requestBody);
    // valid body
    const { email, password } = body;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user)
      return NextResponse.json(
        { message: error?.message || "Unable to sign up" },
        { status: 400 }
      );

    // If no session (e.g., email confirmation disabled is required), try to create a session
    if (!data.session) {
      await supabase.auth.signInWithPassword({ email, password });
    }

    // Ensure Prisma user exists with Supabase auth id
    const supabaseUser = data.user;

    await prisma.user.upsert({
      where: { id: supabaseUser.id },
      update: {},
      create: {
        id: supabaseUser.id,
        email,
        role: "STUDENT",
      },
    });

    return NextResponse.json(
      { message: "Signup successfully" },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof ZodError)
      //@ts-ignore
      return NextResponse.json({ error: e.errors }, { status: 400 });

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
