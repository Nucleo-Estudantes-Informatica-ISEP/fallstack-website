"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { httpClient } from "@/lib/http/client";
import useSession from "@/hooks/useSession";
import { useUiText } from "@/contexts/UiLanguageContext";
import Input from "@/components/ui/Input";
import PrimaryButton from "@/components/ui/PrimaryButton";
import PrimaryLinkButton from "@/components/ui/PrimaryLinkButton";
import AuthNeiButton from "@/components/AuthNeiButton";
import EmployeeSignUpForm from "@/components/EmployeeSignUpForm";
import {
  signInFailures,
  type SignInFailure,
} from "@/domain/auth/signInFailure";
import { companyInviteCodePattern } from "@/schemas/employeeSignUpSchema";

const companyCodeKey = "fallstack-employee-invite";

interface LoginCardProps {
  initialView?: "employee";
  offseason?: boolean;
  signInFailure?: SignInFailure;
  signInDestination?: string;
  verifyEmailUrl?: string;
  inactive?: boolean;
}

const LoginCard: React.FC<LoginCardProps> = ({
  initialView,
  offseason = false,
  signInFailure,
  signInDestination = "/",
  verifyEmailUrl,
  inactive = false,
}) => {
  const t = useUiText();
  const failure = signInFailure ? signInFailures[signInFailure] : undefined;
  const actionHref =
    signInFailure === "auth-verification-required"
      ? verifyEmailUrl
      : signInDestination === "/"
        ? "/api/auth/login"
        : `/api/auth/login?next=${encodeURIComponent(signInDestination)}`;

  const { user, fetchSession } = useSession();
  const router = useRouter();
  const [registeringEmployee, setRegisteringEmployee] = useState(
    initialView === "employee"
  );
  const [pendingCode, setPendingCode] = useState("");
  const [codeLoaded, setCodeLoaded] = useState(false);
  const [codeStorageError, setCodeStorageError] = useState(false);

  useEffect(() => {
    if (!signInFailure && (!registeringEmployee || !user)) return;
    try {
      const stored = sessionStorage.getItem(companyCodeKey);
      sessionStorage.removeItem(companyCodeKey);
      if (stored && !signInFailure) {
        const [expires, code, extra] = stored.split(":");
        if (
          extra === undefined &&
          /^\d+$/.test(expires) &&
          Number(expires) > Date.now() &&
          companyInviteCodePattern.test(code ?? "")
        ) {
          setPendingCode(code);
        }
      }
    } catch {
      // The authenticated form remains available if browser storage is disabled.
    }
    setCodeLoaded(true);
  }, [signInFailure, registeringEmployee, user]);

  const startEmployeeSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = pendingCode.trim();
    if (!companyInviteCodePattern.test(code)) return;
    try {
      sessionStorage.setItem(
        companyCodeKey,
        `${Date.now() + 10 * 60 * 1000}:${code}`
      );
    } catch {
      setCodeStorageError(true);
      return;
    }
    window.location.assign("/api/auth/login?next=%2Flogin%3Fmodal%3Demployee");
  };

  const closeEmployeeSignup = () => {
    try {
      sessionStorage.removeItem(companyCodeKey);
    } catch {
      // Closing the form must work even when storage is blocked.
    }
    setPendingCode("");
    setRegisteringEmployee(false);
    router.replace("/login");
  };

  const employeeSuccess = () => {
    fetchSession();
    router.push("/dashboard");
    router.refresh();
  };

  const switchAccount = async () => {
    try {
      const { logoutUrl } = await httpClient.post<{ logoutUrl: string }>(
        "/auth/logout"
      );
      window.location.assign(logoutUrl);
    } catch {
      setSwitchError(true);
    }
  };
  const [switchError, setSwitchError] = useState(false);
  if (inactive)
    return (
      <section className="student-signup-form mx-auto w-full max-w-[567px]">
        <h1 className="signup-heading">{t("Iniciar Sessão")}</h1>
        <p role="alert">
          {t(
            "A tua conta ou empresa está inativa. Contacta a organização para recuperar o acesso."
          )}
        </p>
        <a
          className="ui-focus mt-4 block underline"
          href="mailto:support@nei-isep.org"
        >
          support@nei-isep.org
        </a>
        <button
          type="button"
          className="ui-focus mt-6 min-h-11 underline"
          onClick={switchAccount}
        >
          {t("Usar outra conta")}
        </button>
        {switchError && (
          <p role="alert">{t("Não foi possível terminar a sessão.")}</p>
        )}
      </section>
    );

  return (
    <section className="student-signup-form mx-auto w-full max-w-[567px]">
      <h1 className="signup-heading">
        {registeringEmployee
          ? t("Registo de Colaborador")
          : t("Iniciar Sessão")}
      </h1>

      {failure && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-100"
        >
          <p>{t(failure.message)}</p>
          {"action" in failure && actionHref && (
            <a
              href={actionHref}
              className="ui-focus mt-2 inline-block underline"
            >
              {t(failure.action)}
            </a>
          )}
        </div>
      )}

      {registeringEmployee ? (
        offseason ? (
          <>
            <p className="mb-6 text-base leading-relaxed text-gray-300">
              {t("As inscrições de colaboradores estão encerradas.")}
            </p>
            <button
              type="button"
              onClick={closeEmployeeSignup}
              className="mt-4 min-h-11 w-full text-center text-sm text-gray-300 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("Voltar ao início de sessão")}
            </button>
          </>
        ) : user?.role === "EMPLOYEE" ? (
          <>
            <p className="mb-6 text-base leading-relaxed text-gray-300">
              {t("A tua conta já está associada a uma empresa.")}
            </p>
            <PrimaryLinkButton
              href="/dashboard"
              variant="form"
              className="h-12 w-full font-semibold lg:h-16 lg:text-xl"
            >
              {t("Ir para o dashboard da empresa")}
            </PrimaryLinkButton>
          </>
        ) : user ? (
          <>
            <p className="mb-6 text-base leading-relaxed text-gray-300">
              {t(
                "A tua identidade já foi confirmada pelo AuthNEI. Introduz o código fornecido pela empresa para associares esta conta à empresa."
              )}
            </p>
            {codeLoaded && (
              <EmployeeSignUpForm
                initialCode={pendingCode}
                onSuccess={employeeSuccess}
              />
            )}
            <button
              type="button"
              onClick={closeEmployeeSignup}
              className="mt-4 min-h-11 w-full text-center text-sm text-gray-300 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("Cancelar")}
            </button>
          </>
        ) : (
          <>
            <p className="mb-6 text-base leading-relaxed text-gray-300">
              {t(
                "Introduz o código da empresa e inicia sessão no AuthNEI. Depois confirma a associação no FallStack."
              )}
            </p>
            <form
              onSubmit={startEmployeeSignIn}
              className="flex flex-col gap-4"
            >
              <Input
                name={t("Código da Empresa")}
                value={pendingCode}
                onChange={(event) => setPendingCode(event.target.value)}
                autoComplete="off"
                maxLength={80}
                required
              />
              {pendingCode &&
                !companyInviteCodePattern.test(pendingCode.trim()) && (
                  <p role="alert" className="text-sm text-red-300">
                    {t("Código de empresa inválido.")}
                  </p>
                )}
              {codeStorageError && (
                <p role="alert" className="text-sm text-red-300">
                  {t(
                    "Não foi possível guardar o código. Inicia sessão e volta ao registo de colaborador para o introduzir."
                  )}
                </p>
              )}
              <PrimaryButton
                type="submit"
                disabled={!companyInviteCodePattern.test(pendingCode.trim())}
                variant="form"
                className="h-12 w-full font-semibold lg:h-16 lg:text-xl"
              >
                {t("Continuar com AuthNEI")}
              </PrimaryButton>
            </form>
            {codeStorageError && <AuthNeiButton next="/login?modal=employee" />}
            <button
              type="button"
              onClick={closeEmployeeSignup}
              className="mt-4 min-h-11 w-full text-center text-sm text-gray-300 underline"
            >
              {t("Cancelar")}
            </button>
          </>
        )
      ) : (
        <>
          <p className="mb-6 text-base leading-relaxed text-gray-300">
            {t(
              "Estudantes, colaboradores e administradores usam a mesma conta AuthNEI. As permissões são atribuídas automaticamente pelo NEI e pela empresa associada."
            )}
          </p>
          {(!failure || !("action" in failure) || !actionHref) && (
            <AuthNeiButton next={signInDestination} />
          )}
          <p className="mt-3 text-sm text-gray-300">
            {t(
              "Esqueceste-te da palavra-passe? A recuperação é feita no próprio AuthNEI."
            )}
          </p>

          {!offseason && (
            <>
              <p className="mt-8 mb-3 text-center text-sm text-gray-300">
                {t("Ainda não tens uma conta?")}
              </p>
              <PrimaryLinkButton
                href="/signup"
                variant="form"
                className="h-12 w-full font-semibold lg:h-16 lg:text-xl"
              >
                {t("Criar uma conta")}
              </PrimaryLinkButton>
              <a
                href="/signup/employee"
                className="mt-6 flex min-h-11 w-full items-center justify-center text-center text-sm text-gray-300 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t("Tens um código de empresa? Regista-te como colaborador")}
              </a>
            </>
          )}
        </>
      )}
    </section>
  );
};

export default LoginCard;
