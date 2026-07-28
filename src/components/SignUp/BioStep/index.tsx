"use client";

import { Dispatch, FunctionComponent, SetStateAction, useRef } from "react";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import PrimaryButton from "@/components/PrimaryButton";
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
      <div className="flex w-[90%] flex-col">
        <p className="mb-8 font-sans text-[45px] font-semibold text-white">
          Criar uma conta
        </p>

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
          className="mt-4 mb-5 h-14 w-full font-bold"
        >
          Seguinte
        </PrimaryButton>
      </div>
    </div>
  );
};
export default BioStep;
