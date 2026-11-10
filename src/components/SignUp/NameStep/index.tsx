"use client";

import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import Input from "@/components/ui/Input";
import PrimaryButton from "@/components/ui/PrimaryButton";

interface NameStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
}

const NameStep: FunctionComponent<NameStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
}) => {
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    if (!inputRef.current?.value) return setError("Este campo é obrigatório.");

    setData({ ...data, name: inputRef.current.value });
    setCurrentStep(currentStep + 1);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleNext();
  };

  return (
    <div className="flex w-full flex-col">
      <h1 className="signup-heading">Criar uma conta</h1>

      <Input
        name="name"
        label="Qual é o teu nome?"
        placeholder="Insere o teu nome"
        center
        inputRef={inputRef}
        onKeyUp={handleKeyUp}
        defaultValue={data.name ? data.name : undefined}
        className={`${error ? "border-2 border-red-600" : ""} z-10`}
      />

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
        variant="form"
        className="mt-8 h-12 w-full font-semibold lg:h-16 lg:text-xl"
      >
        Seguinte
      </PrimaryButton>

      <Link
        href="/login"
        className="mt-5 text-center text-sm text-gray-400 transition-colors hover:text-white"
      >
        Já tenho uma conta
      </Link>
    </div>
  );
};
export default NameStep;
