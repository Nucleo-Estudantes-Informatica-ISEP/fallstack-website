import "server-only";

import { reportError } from "@/lib/logger";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

import {
  findUserWithEmployeeByEmail,
  findUserWithProfile,
} from "../repositories/userRepository";

export default async function getServerSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    const appUser = await findUserWithProfile(user.id);
    if (appUser) return appUser;
    return user.email ? await findUserWithEmployeeByEmail(user.email) : null;
  } catch (error) {
    reportError(
      error,
      { operation: "get_server_session" },
      "Failed to resolve server session"
    );
    return null;
  }
}
