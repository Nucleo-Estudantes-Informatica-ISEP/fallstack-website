"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import useSession from "@/hooks/useSession";
import PrimaryLinkButton from "@/components/ui/PrimaryLinkButton";
import AuthNeiButton from "@/components/AuthNeiButton";
import EmployeeSignUpForm from "@/components/EmployeeSignUpForm";

interface LoginCardProps {
  initialView?: "employee";
  offseason?: boolean;
  authError?: boolean;
}

const LoginCard: React.FC<LoginCardProps> = ({
  initialView,
  offseason = false,
  authError = false,
}) => {
  const { user, fetchSession } = useSession();
  const router = useRouter();
  const [registeringEmployee, setRegisteringEmployee] = useState(
    initialView === "employee"
  );

  const closeEmployeeSignup = () => {
    setRegisteringEmployee(false);
    router.replace("/login");
  };

  const employeeSuccess = () => {
    fetchSession();
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <section className="student-signup-form mx-auto w-full max-w-[567px]">
      <h1 className="signup-heading">
        {registeringEmployee ? "Registo de Colaborador" : "Iniciar Sessão"}
      </h1>

      {authError && (
        <p
          role="alert"
          className="mb-6 rounded-md border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-100"
        >
          Não foi possível concluir o início de sessão com o AuthNEI. Tenta
          novamente.
        </p>
      )}

      {registeringEmployee ? (
        offseason ? (
          <>
            <p className="mb-6 text-base leading-relaxed text-gray-300">
              As inscrições de colaboradores estão encerradas.
            </p>
            <button
              type="button"
              onClick={closeEmployeeSignup}
              className="mt-4 min-h-11 w-full text-center text-sm text-gray-300 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Voltar ao início de sessão
            </button>
          </>
        ) : user?.role === "EMPLOYEE" ? (
          <>
            <p className="mb-6 text-base leading-relaxed text-gray-300">
              A tua conta já está associada a uma empresa.
            </p>
            <PrimaryLinkButton
              href="/dashboard"
              variant="form"
              className="h-12 w-full font-semibold lg:h-16 lg:text-xl"
            >
              Ir para o dashboard da empresa
            </PrimaryLinkButton>
          </>
        ) : user ? (
          <>
            <p className="mb-6 text-base leading-relaxed text-gray-300">
              A tua identidade já foi confirmada pelo AuthNEI. Introduz o código
              fornecido pela empresa para associares esta conta à empresa.
            </p>
            <EmployeeSignUpForm onSuccess={employeeSuccess} />
            <button
              type="button"
              onClick={closeEmployeeSignup}
              className="mt-4 min-h-11 w-full text-center text-sm text-gray-300 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <p className="mb-6 text-base leading-relaxed text-gray-300">
              Primeiro inicia sessão no AuthNEI. Depois regressas aqui para
              associares a tua conta à empresa com o código de colaborador.
            </p>
            <AuthNeiButton next="/login?modal=employee" />
          </>
        )
      ) : (
        <>
          <p className="mb-6 text-base leading-relaxed text-gray-300">
            Estudantes, colaboradores e administradores usam a mesma conta
            AuthNEI. As permissões são atribuídas automaticamente pelo NEI e
            pela empresa associada.
          </p>
          <AuthNeiButton />
          <p className="mt-3 text-sm text-gray-300">
            Esqueceste-te da palavra-passe? A recuperação é feita no próprio
            AuthNEI.
          </p>

          {!offseason && (
            <>
              <p className="mt-8 mb-3 text-center text-sm text-gray-300">
                Ainda não tens uma conta?
              </p>
              <PrimaryLinkButton
                href="/signup"
                variant="form"
                className="h-12 w-full font-semibold lg:h-16 lg:text-xl"
              >
                Criar uma conta
              </PrimaryLinkButton>
              <a
                href="/signup/employee"
                className="mt-6 flex min-h-11 w-full items-center justify-center text-center text-sm text-gray-300 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Tens um código de empresa? Regista-te como colaborador
              </a>
            </>
          )}
        </>
      )}
    </section>
  );
};

export default LoginCard;
