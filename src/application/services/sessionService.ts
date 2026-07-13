import "server-only";

import { Email } from "@/types/Email";
import { reportError } from "@/lib/logger";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

import {
  findUserSessionByEmail,
  findUserSessionById,
} from "../repositories/userRepository";

export default async function getServerSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    const appUser = await findUserSessionById(user.id);
    if (appUser) return appUser;
    return user.email
      ? await findUserSessionByEmail(user.email as Email)
      : null;
  } catch (error) {
    reportError(
      error,
      { operation: "get_server_session" },
      "Failed to resolve server session"
    );
    return null;
  }
}
