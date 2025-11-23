"use client";

import { Dispatch, FunctionComponent, SetStateAction, useState } from "react";
import Image from "next/image";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import PrimaryButton from "@/components/PrimaryButton";
import InterestSelector from "@/components/Profile/InterestSelector";

interface InterestsStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
}

const InterestsStep: FunctionComponent<InterestsStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
}) => {
  const [interests, setInterests] = useState<string[]>(data.interests || []);

  const handleNext = () => {
    setData({ ...data, interests });
    setCurrentStep(currentStep + 1);
  };

  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-[90%] flex flex-col">
        <p className="font-sans text-[45px] font-semibold text-white mb-8">
          Criar uma conta
        </p>

        <p className="font-sans text-base font-normal text-white mb-4">
          Escolhe os teus interesses. (Opcional)
        </p>

        <InterestSelector
          userInterests={interests}
          setUserInterests={setInterests}
          scrollable
        />

        <PrimaryButton onClick={handleNext} className="mb-5 mt-4 font-bold w-full h-14">
          Seguinte
        </PrimaryButton>
      </div>
    </div>
  );
};
export default InterestsStep;
