import { redirect } from "next/navigation";

import { serverEnv } from "@/config/env.server";
import LoginCard from "@/components/LoginCard";
import { sanitizeNext } from "@/domain/auth/sanitizeNext";
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
  const destination = sanitizeNext(typeof next === "string" ? next : null);
  const returnTo = new URL("/login", serverEnv.AUTH_REDIRECT_URI);
  if (modal === "employee") returnTo.searchParams.set("modal", "employee");
  if (destination !== "/") returnTo.searchParams.set("next", destination);
  const helpUrl = new URL("/ui/v2/login/help", serverEnv.AUTH_ISSUER_URL);
  helpUrl.searchParams.set("returnTo", returnTo.toString());
  return (
    <LoginCard
      authHelpUrl={helpUrl.toString()}
      initialView={modal === "employee" ? "employee" : undefined}
      offseason={serverEnv.EVENT_MODE === "offseason"}
      signInFailure={parseSignInFailure(error)}
      signInDestination={destination}
      verifyEmailUrl={`/api/auth/login?verifyEmail=1&next=${encodeURIComponent(destination)}`}
      inactive={await isCurrentAccountInactive()}
    />
  );
};

export default LoginPage;
