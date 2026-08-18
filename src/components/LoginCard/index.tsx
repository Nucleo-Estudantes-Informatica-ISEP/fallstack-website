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
          <AuthNeiButton
            next="/signup?authnei=1"
            icon={
              // Cropped to just the circular mark from
              // public/assets/images/logo-nei-noText.svg (that file's viewBox
              // is 317x82, the full "nei" wordmark) - this is only the first,
              // self-contained path, i.e. the icon without the lettering next
              // to it. Inlined rather than a component so it doesn't need its
              // own PascalCaseName/index.tsx folder for a one-off, /login-only
              // decoration.
              <svg
                viewBox="0 0 85 83"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-5 shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M42.4492 0.155512C42.8918 0.157515 43.3296 0.247683 43.7367 0.420716C44.1435 0.59219 44.5124 0.84182 44.8224 1.15536C45.4467 1.79202 45.793 2.64895 45.7858 3.53915V15.4276C56.8783 17.3786 65.359 28.0233 65.359 40.8659C65.359 55.0925 54.9607 66.6243 42.1158 66.6243C29.2709 66.6243 18.8727 55.0925 18.8727 40.8659C18.8727 27.7886 27.6653 16.9884 39.0575 15.3301V7.0112C30.6165 7.765 22.7555 11.611 16.9941 17.8059C11.2326 24.0008 7.97974 32.1046 7.86425 40.551C7.74876 48.9974 10.7788 57.1866 16.3688 63.5356C21.9587 69.8847 29.7116 73.9428 38.1289 74.9256C46.5462 75.9084 55.0301 73.7461 61.9409 68.8567C68.8517 63.9672 73.6985 56.6977 75.5447 48.4534C77.3908 40.2091 76.105 31.5753 71.936 24.221C67.7669 16.8666 61.0105 11.3138 52.9728 8.63596C52.1264 8.35299 51.4275 7.74649 51.0297 6.94986C50.632 6.15324 50.568 5.23175 50.8519 4.38811C51.1358 3.54448 51.7443 2.8478 52.5435 2.45135C53.3427 2.05489 54.2672 1.99114 55.1136 2.2741C64.8858 5.55404 73.0584 12.3852 78.0012 21.4051C82.944 30.425 84.2938 40.9707 81.7814 50.9386C79.2689 60.9066 73.0789 69.5641 64.4459 75.1845C55.813 80.8049 45.3716 82.975 35.2045 81.262C25.0374 79.5489 15.8918 74.0786 9.59195 65.9422C3.29207 57.8058 0.300954 47.6013 1.2152 37.3641C2.12944 27.1268 6.88185 17.6094 14.5245 10.71C22.1672 3.81061 32.1383 0.0364401 42.4492 0.14027V0.155512ZM39.0483 22.14C31.8032 23.7587 25.5918 31.0076 25.5918 40.8507C25.5918 52.0594 33.6382 59.9027 42.1066 59.9027C50.5751 59.9027 58.6215 52.0594 58.6215 40.8507C58.6215 31.285 52.7587 24.1702 45.7766 22.2894V35.8209C45.7766 36.7103 45.4222 37.5631 44.7913 38.192C44.1604 38.8208 43.3047 39.1741 42.4125 39.1741C41.5202 39.1741 40.6646 38.8208 40.0337 38.192C39.4028 37.5631 39.0483 36.7103 39.0483 35.8209V22.14Z"
                  fill="currentColor"
                />
              </svg>
            }
          />
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
