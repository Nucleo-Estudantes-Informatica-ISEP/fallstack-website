import { redirect } from "next/navigation";

import { serverEnv } from "@/config/env.server";
import LoginCard from "@/components/LoginCard";
import { sanitizeNext } from "@/app/auth/callback/sanitizeNext";
import getServerSession, {
  isCurrentAccountInactive,
} from "@/application/services/sessionService";
import { parseSignInFailure } from "@/domain/auth/signInFailure";

interface LoginPageProps {
  // Only "employee" is meaningful here (the /signup/employee redirect and
  // any hand-crafted deep-link); any other value falls back to the default
  // Estudante/AuthNEI view.
  searchParams: Promise<{ modal?: string; error?: string; next?: string }>;
}

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const session = await getServerSession();
  if (session?.role === "EMPLOYEE" && session.employee) {
    redirect("/dashboard");
  }

  const { modal, error, next } = await searchParams;
  return (
    <LoginCard
      initialView={modal === "employee" ? "employee" : undefined}
      offseason={serverEnv.EVENT_MODE === "offseason"}
      signInFailure={parseSignInFailure(error)}
      signInDestination={sanitizeNext(typeof next === "string" ? next : null)}
      verifyEmailUrl="/api/auth/login?verifyEmail=1"
      inactive={await isCurrentAccountInactive()}
    />
  );
};

export default LoginPage;
