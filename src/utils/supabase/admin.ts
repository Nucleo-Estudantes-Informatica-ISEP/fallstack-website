import { createClient } from "@supabase/supabase-js";

// Service-role client for privileged server operations (never exposed to client)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

