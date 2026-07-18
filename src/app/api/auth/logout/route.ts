import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import config from "@/config";
import { defineHandler } from "@/lib/http/server";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export const POST = defineHandler({
  auth: "public",
  handler: async () => {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    // also delete legacy auth cookie if present
    (await cookies()).delete({ name: config.cookies.auth.name });

    return NextResponse.json(
      { message: "Signout successfully" },
      { status: 200 }
    );
  },
});
