"use client";

import { Dispatch, FunctionComponent, SetStateAction, useRef } from "react";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import PrimaryButton from "@/components/ui/PrimaryButton";
import UserBioTextArea from "@/components/Profile/UserBioTextArea";

interface BioStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
}

const BioStep: FunctionComponent<BioStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
}) => {
  const LIMIT = 255;
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleNext = () => {
    if (inputRef.current?.value)
      setData({ ...data, bio: inputRef.current.value });
    setCurrentStep(currentStep + 1);
  };

  function handleUserBioChange(bio: string) {
    if (bio.length > LIMIT) return;
    setData({ ...data, bio });
  }
  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex w-[90%] max-w-md flex-col">
        <h1 className="mb-8 font-sans text-3xl font-bold text-white sm:text-4xl">
          Criar uma conta
        </h1>

        <UserBioTextArea
          name="Conta-nos mais sobre ti. (Opcional)"
          ref={inputRef}
          placeholder=""
          className="mb-4"
          value={data.bio ? data.bio : ""}
          autoFocus
          setValue={handleUserBioChange}
          limit={LIMIT}
          warningLimit={LIMIT - 30}
        />

        <PrimaryButton
          onClick={handleNext}
          className="mt-6 mb-5 h-12 w-full rounded-full font-semibold"
        >
          Seguinte
        </PrimaryButton>
      </div>
    </div>
  );
};
export default BioStep;
