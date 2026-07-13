import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/http/server";
import { signInSchema } from "@/schemas/signInSchema";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export const POST = defineHandler({
  auth: "public",
  schema: signInSchema,
  handler: async ({ body }) => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(body);

    if (error)
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );

    return NextResponse.json(
      { message: "Sign in successfully" },
      { status: 200 }
    );
  },
});
