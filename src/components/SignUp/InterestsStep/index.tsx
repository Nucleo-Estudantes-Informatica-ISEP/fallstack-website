"use client";

import { Dispatch, FunctionComponent, SetStateAction, useState } from "react";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import PrimaryButton from "@/components/ui/PrimaryButton";
import InterestSelector from "@/components/Profile/InterestSelector";
import type { InterestDto } from "@/application/dto/interestDto";

interface InterestsStepProps {
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  data: StudentSignUpData;
  setData: Dispatch<SetStateAction<StudentSignUpData>>;
  availableInterests: InterestDto[];
}

const InterestsStep: FunctionComponent<InterestsStepProps> = ({
  currentStep,
  setCurrentStep,
  data,
  setData,
  availableInterests,
}) => {
  const [interests, setInterests] = useState<string[]>(data.interests || []);

  const handleNext = () => {
    setData({ ...data, interests });
    setCurrentStep(currentStep + 1);
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex w-[90%] flex-col">
        <p className="mb-8 font-sans text-[45px] font-semibold text-white">
          Criar uma conta
        </p>

        <p className="mb-4 font-sans text-base font-normal text-white">
          Escolhe os teus interesses. (Opcional)
        </p>

        <InterestSelector
          availableInterests={availableInterests}
          userInterests={interests}
          setUserInterests={setInterests}
          scrollable
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
export default InterestsStep;
