import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import Input from "@/components/Input";
import InputSelect from "@/components/InputSelect";
import PrimaryButton from "@/components/PrimaryButton";

interface AccountDetailsStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
}

const AccountDetailsStep: FunctionComponent<AccountDetailsStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
}) => {
  const [error, setError] = useState<string | null>(null);

  const yearRef = useRef<HTMLSelectElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    // Validate year
    if (!yearRef.current?.value) {
      return setError("Por favor, seleciona o teu ano.");
    }

    // Validate email
    if (!emailRef.current?.value) {
      return setError("Por favor, insere o teu email institucional.");
    }

    const emailRegex = new RegExp(/^([0-9]{7}|[a-zA-Z]{3})@isep.ipp.pt$/i);
    const email = emailRef.current.value;

    if (!email.match(emailRegex)) {
      return setError("Insere um email institucional válido.");
    }

    // Validate password
    if (!passwordRef.current?.value) {
      return setError("Por favor, insere uma password.");
    }

    if (!passwordConfirmRef.current?.value) {
      return setError("Por favor, confirma a tua password.");
    }

    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      return setError("As passwords não coincidem.");
    }

    const passwordRegex = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/);
    const password = passwordRef.current.value;

    if (password.length < 8) {
      return setError("A password deve conter pelo menos 8 caracteres.");
    }

    if (!password.match(passwordRegex)) {
      return setError(
        "A password deve conter pelo menos 1 letra maiúscula, 1 letra minúscula e 1 número."
      );
    }

    setData({
      ...data,
      year: yearRef.current.value,
      email: emailRef.current.value,
      password: passwordRef.current.value,
    });
    setCurrentStep(currentStep + 1);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleNext();
  };

  const yearOptions = [
    "1º Ano Licenciatura",
    "2º Ano Licenciatura",
    "3º Ano Licenciatura",
    "1º Ano Mestrado",
    "2º Ano Mestrado",
  ];

  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-[90%] flex flex-col">
        <p className="font-sans text-[45px] font-semibold text-white mb-8">
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

          <Input
            type="email"
            name="Email Institucional"
            placeholder=""
            center
            inputRef={emailRef}
            onKeyUp={handleKeyUp}
            defaultValue={data.email ? data.email : undefined}
            className={`${error && !emailRef.current?.value ? "border-2 border-red-600" : ""} z-10`}
          />

          <Input
            type="password"
            name="Palavra-passe"
            placeholder=""
            center
            inputRef={passwordRef}
            onKeyUp={handleKeyUp}
            defaultValue={data.password ? data.password : undefined}
            className={`${error && !passwordRef.current?.value ? "border-2 border-red-600" : ""} z-10`}
          />

          <Input
            type="password"
            name="Confirmar Palavra-passe"
            placeholder=""
            center
            inputRef={passwordConfirmRef}
            onKeyUp={handleKeyUp}
            defaultValue={data.password ? data.password : undefined}
            className={`${error && !passwordConfirmRef.current?.value ? "border-2 border-red-600" : ""} z-10`}
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

        <PrimaryButton onClick={handleNext} className="mb-5 mt-4 font-bold w-full h-14">
          Seguinte
        </PrimaryButton>
      </div>
    </div>
  );
};

export default AccountDetailsStep;
