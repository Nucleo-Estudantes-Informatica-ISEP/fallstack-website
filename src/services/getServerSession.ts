import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

import prisma from "@/lib/prisma";

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
        } as any);
        if (byEmail) return byEmail as any;
      } catch (_) {
        // ignore if email not a unique field in schema
      }
    }

    return null;
  } catch (e) {
    console.log("Supabase session error", e);
    return null;
  }
};

export default getServerSession;
