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
  const [interestIds, setInterestIds] = useState<string[]>(
    data.interests || []
  );

  const handleNext = () => {
    setData({ ...data, interests: interestIds });
    setCurrentStep(currentStep + 1);
  };

  return (
    <div className="flex w-full flex-col">
      <h1 className="mb-8 font-title text-4xl text-white lg:mb-14 lg:text-5xl">
        Criar uma conta
      </h1>

      <p className="mb-4 font-sans text-base font-normal text-white">
        Escolhe os teus interesses. (Opcional)
      </p>

      <InterestSelector
        availableInterests={availableInterests}
        selectedInterestIds={interestIds}
        setSelectedInterestIds={setInterestIds}
        scrollable
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
export default InterestsStep;
