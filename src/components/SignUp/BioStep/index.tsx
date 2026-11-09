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
    <div className="flex w-full flex-col">
      <h1 className="mb-8 font-title text-4xl text-white lg:mb-14 lg:text-5xl">
        Criar uma conta
      </h1>

      <UserBioTextArea
        name="Conta-nos mais sobre ti. (Opcional)"
        ref={inputRef}
        placeholder=""
        className="mb-4"
        value={data.bio ? data.bio : ""}
        setValue={handleUserBioChange}
        limit={LIMIT}
        warningLimit={LIMIT - 30}
      />

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
export default BioStep;
