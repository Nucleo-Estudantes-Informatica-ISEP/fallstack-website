import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import Input from "@/components/ui/Input";
import InputSelect from "@/components/ui/InputSelect";
import PrimaryButton from "@/components/ui/PrimaryButton";

interface AccountDetailsStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
  institutionalEmail: string;
}

const AccountDetailsStep: FunctionComponent<AccountDetailsStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
  institutionalEmail,
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
    { value: "1º Ano Licenciatura", label: "1º Ano - Licenciatura" },
    { value: "2º Ano Licenciatura", label: "2º Ano - Licenciatura" },
    { value: "3º Ano Licenciatura", label: "3º Ano - Licenciatura" },
    { value: "1º Ano Mestrado", label: "1º Ano - Mestrado" },
    { value: "2º Ano Mestrado", label: "2º Ano - Mestrado" },
  ];

  return (
    <div className="flex w-full flex-col">
      <h1 className="signup-heading">Criar uma conta</h1>

      <div className="flex flex-col gap-y-4 text-left">
        <InputSelect
          center
          name="Seleciona o teu ano"
          placeholder="Insere o ano"
          inputRef={yearRef}
          defaultValue={data.year ? data.year : undefined}
          className="aria-invalid:border-red-400"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "signup-year-error" : undefined}
          onChange={() => setError(null)}
          options={yearOptions}
        />
        <Input
          id="signup-institutional-email"
          name="institutional-email"
          label="Email institucional"
          value={institutionalEmail}
          readOnly
          hint="Confirmado pelo AuthNEI."
        />
      </div>

      {error && (
        <motion.p
          id="signup-year-error"
          role="alert"
          className="mt-2 text-sm text-red-400"
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
        variant="form"
        className="mt-8 h-12 w-full font-semibold lg:h-16 lg:text-xl"
      >
        Seguinte
      </PrimaryButton>
    </div>
  );
};

export default AccountDetailsStep;
