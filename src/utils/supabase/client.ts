import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/config/env.client";

export const createClient = () =>
  createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
