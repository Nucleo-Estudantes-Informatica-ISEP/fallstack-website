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
import UiText from "@/components/ui/UiText";
import { STUDENT_YEAR } from "@/domain/student/year";
import { isIsepEmail } from "@/utils/isepEmail";

interface AccountDetailsStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
  /** True when AuthNEI gave no display name, so the student must enter one. */
  needsName?: boolean;
}

const AccountDetailsStep: FunctionComponent<AccountDetailsStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
  needsName = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const yearRef = useRef<HTMLSelectElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    const name = nameRef.current?.value.trim() ?? "";
    if (needsName && !name) {
      return setError("Por favor, indica o teu nome.");
    }
    if (!yearRef.current?.value) {
      return setError("Por favor, seleciona o teu ano.");
    }
    if (!data.course?.trim()) return setError("Por favor, indica o teu curso.");
    const email = emailRef.current?.value.trim().toLowerCase() ?? "";
    if (!isIsepEmail(email))
      return setError("Insere um email institucional válido.");
    setData({
      ...data,
      email,
      name: needsName ? name : data.name,
      course: data.course.trim(),
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
      <h1 className="signup-heading">
        <UiText text="Criar uma conta" />
      </h1>

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
            onChange={(event) => {
              setError(null);
              setData({ ...data, name: event.target.value });
            }}
          />
        )}
        <Input
          id="signup-course"
          name="course"
          label="Curso"
          placeholder="Ex.: Engenharia Informática"
          value={data.course ?? ""}
          maxLength={100}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "signup-year-error" : undefined}
          onChange={(event) => {
            setError(null);
            setData({ ...data, course: event.target.value });
          }}
        />
        <InputSelect
          center
          name="Seleciona o teu ano"
          placeholder="Insere o ano"
          inputRef={yearRef}
          defaultValue={data.year ?? ""}
          className="aria-invalid:border-red-400"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "signup-year-error" : undefined}
          onChange={(event) => {
            setError(null);
            setData({ ...data, year: event.target.value });
          }}
          options={yearOptions}
        />
        <Input
          id="signup-institutional-email"
          name="institutional-email"
          label="Email institucional"
          type="email"
          inputRef={emailRef}
          defaultValue={data.email ?? ""}
          required
          maxLength={254}
          hint="Indica o teu email do ISEP."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "signup-year-error" : undefined}
          onChange={(event) => {
            setError(null);
            setData({ ...data, email: event.target.value });
          }}
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
        <UiText text="Seguinte" />
      </PrimaryButton>
    </div>
  );
};

export default AccountDetailsStep;
