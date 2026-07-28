import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import InputSelect from "@/components/ui/InputSelect";
import PrimaryButton from "@/components/ui/PrimaryButton";
import AuthNeiButton from "@/components/AuthNeiButton";

interface AccountDetailsStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
  // True when this step is being rendered after returning from a successful
  // AuthNEI sign-in — Supabase already has an authenticated identity for
  // this student at this point, only the year is missing.
  authNeiMode?: boolean;
  // Stashes any wizard data collected so far before redirecting to AuthNEI,
  // since the OAuth flow is a full page navigation that clears React state.
  onAuthNeiRedirect?: () => void;
}

const AccountDetailsStep: FunctionComponent<AccountDetailsStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
  authNeiMode = false,
  onAuthNeiRedirect,
}) => {
  const [error, setError] = useState<string | null>(null);
  const yearRef = useRef<HTMLSelectElement>(null);

  const handleNext = () => {
    if (!yearRef.current?.value) {
      return setError("Por favor, seleciona o teu ano.");
    }
    setData({ ...data, year: yearRef.current.value });
    setCurrentStep(currentStep + 1);
  };

  const yearOptions = [
    "1º Ano Licenciatura",
    "2º Ano Licenciatura",
    "3º Ano Licenciatura",
    "1º Ano Mestrado",
    "2º Ano Mestrado",
  ];

  // Account creation happens exclusively through AuthNEI (centralizes
  // student identity across NEI platforms on Supabase Auth, with Zitadel as
  // the OAuth provider) — there's no manual email/password fallback, so
  // there's nothing else to collect on this step until that redirect
  // completes and authNeiMode flips true.
  if (!authNeiMode) {
    return (
      <div className="flex w-full flex-col items-center">
        <div className="flex w-[90%] flex-col">
          <p className="mb-8 font-sans text-[45px] font-semibold text-white">
            Criar uma conta
          </p>
          <p className="mb-4 text-sm text-gray-400">
            A criação de conta é feita exclusivamente através do AuthNEI, a
            forma centralizada de te ligares às plataformas do NEI.
          </p>
          <AuthNeiButton
            next="/signup?authnei=1"
            beforeRedirect={onAuthNeiRedirect}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex w-[90%] flex-col">
        <p className="mb-8 font-sans text-[45px] font-semibold text-white">
          Criar uma conta
        </p>

        <div className="flex flex-col gap-y-4 text-left">
          <InputSelect
            center
            name="Seleciona o teu ano"
            placeholder="Insere o ano"
            inputRef={yearRef}
            defaultValue={data.year ? data.year : undefined}
            autoFocus
            className={`${error && !yearRef.current?.value ? "border-2 border-red-600" : ""} z-10`}
            options={yearOptions}
          />
        </div>

        {error && (
          <motion.p
            className="mt-1 text-center text-sm font-bold text-red-600"
            animate={{
              y: [-15, 0],
            }}
            transition={{
              ease: "easeOut",
              duration: 0.2,
            }}
          >
            {error}
          </motion.p>
        )}

        <PrimaryButton
          onClick={handleNext}
          className="mt-4 mb-5 h-14 w-full font-bold"
        >
          Seguinte
        </PrimaryButton>
      </div>
    </div>
  );
};

export default AccountDetailsStep;
