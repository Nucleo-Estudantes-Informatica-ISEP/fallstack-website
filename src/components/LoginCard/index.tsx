"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import useSession from "@/hooks/useSession";
import AuthNeiButton from "@/components/AuthNeiButton";
import EmployeeSignUpForm from "@/components/EmployeeSignUpForm";

interface LoginCardProps {
  initialView?: "employee";
}

const NeiIcon = () => (
  <svg viewBox="0 0 85 83" fill="none" className="size-5 shrink-0" aria-hidden="true">
    <path
      d="M42.4492 0.155512C42.8918 0.157515 43.3296 0.247683 43.7367 0.420716C44.1435 0.59219 44.5124 0.84182 44.8224 1.15536C45.4467 1.79202 45.793 2.64895 45.7858 3.53915V15.4276C56.8783 17.3786 65.359 28.0233 65.359 40.8659C65.359 55.0925 54.9607 66.6243 42.1158 66.6243C29.2709 66.6243 18.8727 55.0925 18.8727 40.8659C18.8727 27.7886 27.6653 16.9884 39.0575 15.3301V7.0112C30.6165 7.765 22.7555 11.611 16.9941 17.8059C11.2326 24.0008 7.97974 32.1046 7.86425 40.551C7.74876 48.9974 10.7788 57.1866 16.3688 63.5356C21.9587 69.8847 29.7116 73.9428 38.1289 74.9256C46.5462 75.9084 55.0301 73.7461 61.9409 68.8567C68.8517 63.9672 73.6985 56.6977 75.5447 48.4534C77.3908 40.2091 76.105 31.5753 71.936 24.221C67.7669 16.8666 61.0105 11.3138 52.9728 8.63596C52.1264 8.35299 51.4275 7.74649 51.0297 6.94986C50.632 6.15324 50.568 5.23175 50.8519 4.38811C51.1358 3.54448 51.7443 2.8478 52.5435 2.45135C53.3427 2.05489 54.2672 1.99114 55.1136 2.2741C64.8858 5.55404 73.0584 12.3852 78.0012 21.4051C82.944 30.425 84.2938 40.9707 81.7814 50.9386C79.2689 60.9066 73.0789 69.5641 64.4459 75.1845C55.813 80.8049 45.3716 82.975 35.2045 81.262C25.0374 79.5489 15.8918 74.0786 9.59195 65.9422C3.29207 57.8058 0.300954 47.6013 1.2152 37.3641C2.12944 27.1268 6.88185 17.6094 14.5245 10.71C22.1672 3.81061 32.1383 0.0364401 42.4492 0.14027V0.155512ZM39.0483 22.14C31.8032 23.7587 25.5918 31.0076 25.5918 40.8507C25.5918 52.0594 33.6382 59.9027 42.1066 59.9027C50.5751 59.9027 58.6215 52.0594 58.6215 40.8507C58.6215 31.285 52.7587 24.1702 45.7766 22.2894V35.8209C45.7766 36.7103 45.4222 37.5631 44.7913 38.192C44.1604 38.8208 43.3047 39.1741 42.4125 39.1741C41.5202 39.1741 40.6646 38.8208 40.0337 38.192C39.4028 37.5631 39.0483 36.7103 39.0483 35.8209V22.14Z"
      fill="currentColor"
    />
  </svg>
);

const LoginCard: React.FC<LoginCardProps> = ({ initialView }) => {
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
    <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#121212] p-6 shadow-2xl sm:p-8">
      <h1 className="mb-4 w-full text-center font-sans text-2xl font-semibold text-white md:text-[32px]">
        {registeringEmployee ? "Registo de Colaborador" : "Iniciar Sessão"}
      </h1>

      {registeringEmployee ? (
        user ? (
          <section className="flex max-h-[70vh] flex-col overflow-y-auto">
            <p className="mb-5 text-sm text-gray-400">
              A tua identidade já foi confirmada pelo AuthNEI. Introduz o código
              fornecido pela empresa para associares esta conta à empresa.
            </p>
            <EmployeeSignUpForm onSuccess={employeeSuccess} />
            <button
              type="button"
              onClick={closeEmployeeSignup}
              className="mt-4 text-center text-sm text-gray-400 underline"
            >
              Cancelar
            </button>
          </section>
        ) : (
          <section>
            <p className="mb-5 text-sm text-gray-400">
              Primeiro inicia sessão no AuthNEI. Depois regressas aqui para
              associares a tua conta à empresa com o código de colaborador.
            </p>
            <AuthNeiButton next="/login?modal=employee" icon={<NeiIcon />} />
          </section>
        )
      ) : (
        <section>
          <p className="mb-5 text-sm text-gray-400">
            Estudantes, colaboradores e administradores usam a mesma conta
            AuthNEI. As permissões são atribuídas automaticamente pelo NEI e
            pela empresa associada.
          </p>
          <AuthNeiButton icon={<NeiIcon />} />
          <button
            type="button"
            onClick={() => setRegisteringEmployee(true)}
            className="mt-6 w-full text-center text-sm text-gray-400 underline"
          >
            Tens um código de empresa? Regista-te como colaborador
          </button>
        </section>
      )}
    </div>
  );
};

export default LoginCard;
