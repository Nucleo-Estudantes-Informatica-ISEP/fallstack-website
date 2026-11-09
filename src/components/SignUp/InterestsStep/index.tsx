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
    <div className="flex w-full flex-col items-center">
      <div className="flex w-[90%] max-w-md flex-col">
        <h1 className="mb-8 font-sans text-3xl font-bold text-white sm:text-4xl">
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
          className="mt-6 mb-5 h-12 w-full rounded-full font-semibold"
        >
          Seguinte
        </PrimaryButton>
      </div>
    </div>
  );
};
export default InterestsStep;
