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
import { STUDENT_YEAR } from "@/domain/student/year";

interface AccountDetailsStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
  institutionalEmail: string;
  /** True when AuthNEI gave no display name, so the student must enter one. */
  needsName?: boolean;
}

const AccountDetailsStep: FunctionComponent<AccountDetailsStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
  institutionalEmail,
  needsName = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const yearRef = useRef<HTMLSelectElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    const name = nameRef.current?.value.trim() ?? "";
    if (needsName && !name) {
      return setError("Por favor, indica o teu nome.");
    }
    if (!yearRef.current?.value) {
      return setError("Por favor, seleciona o teu ano.");
    }
    setData({
      ...data,
      name: needsName ? name : data.name,
      year: yearRef.current.value,
    });
    setCurrentStep(currentStep + 1);
  };

  const yearOptions = Object.values(STUDENT_YEAR).map((value) => ({
    value,
    label: value.replace(" Ano ", " Ano - "),
  }));

  return (
    <div className="flex w-full flex-col">
      <h1 className="signup-heading">Criar uma conta</h1>

      <div className="flex flex-col gap-y-4 text-left">
        {needsName && (
          <Input
            id="signup-name"
            name="name"
            label="Nome"
            inputRef={nameRef}
            defaultValue={data.name ?? ""}
            maxLength={100}
            autoComplete="name"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "signup-year-error" : undefined}
            onChange={() => setError(null)}
          />
        )}
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
