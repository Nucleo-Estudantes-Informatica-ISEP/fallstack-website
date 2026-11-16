"use client";

import { Dispatch, FunctionComponent, SetStateAction } from "react";

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
  return (
    <div className="flex w-full flex-col">
      <h1 className="signup-heading">Criar uma conta</h1>

      <fieldset className="min-w-0">
        <legend className="mb-3 field-text text-white">
          Escolhe os teus interesses. (Opcional)
        </legend>
        <InterestSelector
          availableInterests={availableInterests}
          selectedInterestIds={data.interests ?? []}
          setSelectedInterestIds={(interests) =>
            setData((previous) => ({ ...previous, interests }))
          }
          alignStart
        />
      </fieldset>

      <PrimaryButton
        onClick={() => setCurrentStep(currentStep + 1)}
        variant="form"
        className="mt-8 h-12 w-full font-semibold lg:mt-14 lg:h-16 lg:text-xl"
      >
        Seguinte
      </PrimaryButton>
    </div>
  );
};
export default InterestsStep;
