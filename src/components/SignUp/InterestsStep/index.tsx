"use client";

import { Dispatch, FunctionComponent, SetStateAction } from "react";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import { useUiText } from "@/contexts/UiLanguageContext";
import PrimaryButton from "@/components/ui/PrimaryButton";
import UiText from "@/components/ui/UiText";
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
  const t = useUiText();

  return (
    <div className="flex w-full flex-col">
      <h1 className="signup-heading">{t("Criar uma conta")}</h1>

      <fieldset className="min-w-0">
        <legend className="mb-3 field-text text-white">
          {" "}
          <UiText text="Escolhe os teus interesses. (Opcional)" />{" "}
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
        {t("Seguinte")}
      </PrimaryButton>
    </div>
  );
};
export default InterestsStep;
