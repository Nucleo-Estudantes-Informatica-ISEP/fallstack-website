import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/config/env.server";

// Service-role client for privileged server operations (never exposed to client)
export function createAdminClient() {
  return createClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false },
    }
  );
}
