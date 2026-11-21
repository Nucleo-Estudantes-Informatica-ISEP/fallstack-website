import { redirect } from "next/navigation";

import { serverEnv } from "@/config/env.server";
import LoginCard from "@/components/LoginCard";
import getServerSession, {
  isCurrentAccountInactive,
} from "@/application/services/sessionService";

interface LoginPageProps {
  // Only "employee" is meaningful here (the /signup/employee redirect and
  // any hand-crafted deep-link); any other value falls back to the default
  // Estudante/AuthNEI view.
  searchParams: Promise<{ modal?: string; error?: string }>;
}

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const session = await getServerSession();
  if (session?.role === "EMPLOYEE" && session.employee) {
    redirect("/dashboard");
  }

  const { modal, error } = await searchParams;
  const returnTo = new URL("/login", serverEnv.AUTH_REDIRECT_URI);
  if (modal === "employee") returnTo.searchParams.set("modal", "employee");
  const helpUrl = new URL("/ui/v2/login/help", serverEnv.AUTH_ISSUER_URL);
  helpUrl.searchParams.set("returnTo", returnTo.toString());
  return (
    <LoginCard
      authHelpUrl={helpUrl.toString()}
      initialView={modal === "employee" ? "employee" : undefined}
      offseason={serverEnv.EVENT_MODE === "offseason"}
      authError={error === "auth-code-error"}
      inactive={await isCurrentAccountInactive()}
    />
  );
};

export default LoginPage;
