import { createClient } from "@supabase/supabase-js";

// Service-role client for privileged server operations (never exposed to client)
export function createAdminClient() {
  const url = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_KEY!;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

