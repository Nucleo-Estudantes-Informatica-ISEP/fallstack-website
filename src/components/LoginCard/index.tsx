"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import useSession from "@/hooks/useSession";
import Input from "@/components/ui/Input";
import PrimaryButton from "@/components/ui/PrimaryButton";
import AuthNeiButton from "@/components/AuthNeiButton";
import EmployeeSignUpForm from "@/components/EmployeeSignUpForm";
import { logIn } from "@/client/api/auth";
import getSession from "@/client/api/session";

// Tabs split by *authentication method*, not account type: AuthNEI is
// student-only (login and signup combined in one OAuth click), while the
// password form is generic - it's how admins and already-registered
// employees return, not something student-specific. Employee registration
// (a one-time action, not a recurring one) hangs off the password tab
// instead of getting its own top-level tab, so a returning employee
// doesn't have to guess whether "their" tab has login fields on it.
type Tab = "student" | "login";

const tabButtonClassName = (active: boolean) =>
  `rounded-md py-2 text-center text-sm font-semibold transition-colors ${
    active ? "bg-[#B1440A] text-white" : "text-gray-400 hover:text-white"
  }`;

interface LoginCardProps {
  // Set from the /login?modal=employee deep-link (the old standalone
  // /signup/employee route now redirects here), parsed server-side by
  // login/page.tsx and passed in as the initial view. Driving this from a
  // prop rather than a post-hydration effect means the server-rendered
  // markup already shows the registration form, instead of flashing the
  // Estudante/AuthNEI view first.
  initialView?: "employee";
}

const LoginCard: React.FC<LoginCardProps> = ({ initialView }) => {
  const session = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>(
    initialView === "employee" ? "login" : "student"
  );
  const [registeringEmployee, setRegisteringEmployee] = useState(
    initialView === "employee"
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  // Whether the ?modal=employee deep-link is what put us in the
  // registration view, so closing it should also drop the query param -
  // otherwise a refresh (or sharing/copying the URL) keeps reopening
  // registration unexpectedly. Cleared once actually replaced, so switching
  // tabs back and forth doesn't keep calling router.replace.
  const [pendingModalClear, setPendingModalClear] = useState(
    initialView === "employee"
  );

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const closeRegistration = () => {
    setRegisteringEmployee(false);
    if (pendingModalClear) {
      setPendingModalClear(false);
      router.replace("/login");
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    closeRegistration();
  };

  const handleClick = async () => {
    setEmailError(null);
    setPwError(null);

    let error = false;

    if (!emailRef.current?.value) {
      error = true;
      setEmailError("Insere o teu email.");
    }

    if (!passwordRef.current?.value) {
      error = true;
      setPwError("Insere a tua password.");
    }

    if (error) return;

    setLoading(true);

    const email = emailRef.current?.value as string;
    const password = passwordRef.current?.value as string;

    if (await logIn(email, password)) {
      // session.user (from the AuthContext) is stale here - fetchSession()
      // updates it via setState, which only takes effect on React's *next*
      // render, not synchronously in this same closure. Fetching directly
      // gets the just-established session's real data for this redirect
      // decision, then hands that same value to fetchSession() so the rest
      // of the UI - e.g. TopBar - picks up the new session too, without a
      // second, redundant request for data already in hand.
      const freshUser = await getSession();
      session.fetchSession(freshUser);

      // Redirect based on user role. Checked before role, since an admin
      // account has role: null (it isn't a STUDENT/EMPLOYEE at all) and
      // would otherwise fall through to the generic "/" case below. A
      // STUDENT can be logging in with no Student row yet - e.g. AuthNEI
      // established the account but the signup wizard was abandoned before
      // it finished - so send them back into the wizard to complete it
      // instead of the homepage.
      if (freshUser?.adminRole) {
        router.push("/overview");
      } else if (freshUser?.role === "EMPLOYEE") {
        router.push("/dashboard");
      } else if (freshUser?.role === "STUDENT") {
        router.push(
          freshUser.student ? `/student/${freshUser.student.code}` : "/signup"
        );
      } else {
        router.push("/");
      }

      return router.refresh();
    }

    setEmailError("Email ou password incorretos.");
    setPwError("Email ou password incorretos.");
    setLoading(false);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleClick();
  };

  const heading = registeringEmployee
    ? "Registo de Colaborador"
    : "Iniciar Sessão";

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#121212] p-6 shadow-2xl sm:p-8">
      <h1 className="mb-6 w-full text-center font-sans text-2xl font-semibold text-white md:text-[32px]">
        {heading}
      </h1>

      <div
        className="mb-6 grid grid-cols-2 gap-2 rounded-lg border border-[#2A2A2A] p-1"
        role="group"
        aria-label="Método de acesso"
      >
        <button
          type="button"
          aria-pressed={tab === "student"}
          aria-label="Estudante (AuthNEI)"
          onClick={() => switchTab("student")}
          className={tabButtonClassName(tab === "student")}
        >
          Estudante
        </button>
        <button
          type="button"
          aria-pressed={tab === "login"}
          aria-label="Login (email e password)"
          onClick={() => switchTab("login")}
          className={tabButtonClassName(tab === "login")}
        >
          Login
        </button>
      </div>

      {tab === "student" ? (
        <section className="flex max-h-[70vh] flex-col overflow-y-auto">
          <p className="mb-4 text-sm text-gray-400">
            A criação de conta e o login de estudantes são feitos exclusivamente
            através do AuthNEI, a forma centralizada de te ligares às
            plataformas do NEI.
          </p>
          <AuthNeiButton next="/signup?authnei=1" />
        </section>
      ) : registeringEmployee ? (
        <section className="flex max-h-[70vh] flex-col overflow-y-auto">
          <EmployeeSignUpForm onSuccess={closeRegistration} />
          <button
            type="button"
            onClick={closeRegistration}
            className="mt-4 text-center text-sm text-gray-400 underline"
          >
            Já tens conta? Inicia sessão
          </button>
        </section>
      ) : (
        <section className="flex max-h-[70vh] flex-col overflow-y-auto">
          <div className="w-full">
            <Input
              name="Email"
              placeholder="exemplo@dominio.com"
              inputRef={emailRef}
              autoFocus={!!emailError}
              onKeyUp={handleKeyUp}
              className="!rounded-lg !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
            />
          </div>

          {emailError && (
            <motion.p
              className="mt-1 text-sm font-bold text-red-600"
              animate={{
                y: [-15, 0],
              }}
              transition={{
                ease: "easeOut",
                duration: 0.2,
              }}
            >
              {emailError}
            </motion.p>
          )}

          <span className="mt-3"></span>

          <div className="mt-4 w-full">
            <Input
              name="A tua palavra-passe"
              type="password"
              inputRef={passwordRef}
              autoFocus={!!pwError}
              onKeyUp={handleKeyUp}
              className="!rounded-lg !border-[rgba(255,255,255,0.35)] bg-transparent px-3 py-2 text-white placeholder:text-gray-500 sm:py-3"
            />
          </div>

          {pwError && (
            <motion.p
              className="mt-1 text-sm font-bold text-red-600"
              animate={{
                y: [-15, 0],
              }}
              transition={{
                ease: "easeOut",
                duration: 0.2,
              }}
            >
              {pwError}
            </motion.p>
          )}

          <div className="mt-2 w-full">
            <div className="mb-6 w-full text-right">
              <Link
                href="/password-reset"
                className="text-sm text-gray-400 underline"
              >
                Esqueci-me da palavra-passe
              </Link>
            </div>

            <PrimaryButton
              loading={loading}
              onClick={handleClick}
              className="!flex w-full cursor-pointer !items-center !justify-center !rounded-lg !bg-[#B1440A] !px-3 py-3 !text-[17px] font-semibold !tracking-normal hover:!bg-[#8d3508] sm:py-4 sm:!text-[19px]"
            >
              Login
            </PrimaryButton>
          </div>

          <button
            type="button"
            onClick={() => setRegisteringEmployee(true)}
            className="mt-6 text-center text-sm text-gray-400 underline"
          >
            Ainda não tens conta de colaborador? Regista aqui
          </button>
        </section>
      )}
    </div>
  );
};

export default LoginCard;
