import { reportError } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

const getServerSession = async () => {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Prefer finding by Supabase auth user id
    const prismaUser = await prisma.user.findUserWithProfile(user.id);
    if (prismaUser) return prismaUser;

    // Fallback: try resolving by email if available
    if (user.email) {
      try {
        const byEmail = await prisma.user.findUnique({
          where: { email: user.email },
          include: { employee: { include: { company: true } }, student: true },
        });
        if (byEmail) return byEmail;
      } catch (_) {
        // ignore if email not a unique field in schema
      }
    }

    return null;
  } catch (e) {
    reportError(
      e,
      { operation: "get_server_session" },
      "Failed to resolve server session"
    );
    return null;
  }
};

export default getServerSession;
