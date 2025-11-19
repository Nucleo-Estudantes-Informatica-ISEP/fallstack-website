import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

import { resetSchema } from "@/schemas/resetSchema";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const parsed = resetSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { password, token } = parsed.data;
  // Supabase handles password reset via magic link which sets an access token.
  // This endpoint is deprecated; use Supabase update when authenticated with the reset link.
  const admin = createAdminClient();
  const { data, error } = await admin.auth.updateUser({ password });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Success" });
}
