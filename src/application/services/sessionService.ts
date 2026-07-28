import "server-only";

import { cache } from "react";

import { Email } from "@/types/Email";
import { reportError } from "@/lib/logger";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

import {
  findUserSessionByEmail,
  findUserSessionById,
} from "../repositories/userRepository";

const getServerSession = cache(async () => {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    const appUser =
      (await findUserSessionById(user.id)) ??
      (user.email ? await findUserSessionByEmail(user.email as Email) : null);
    // Deactivated in the admin backoffice - reject the session outright so
    // every auth-gated route/page treats them as logged out, not just the
    // ones that happen to check `active` themselves.
    if (!appUser || !appUser.active) return null;
    return appUser;
  } catch (error) {
    reportError(
      error,
      { operation: "get_server_session" },
      "Failed to resolve server session"
    );
    return null;
  }
});

export default getServerSession;
