"use client";

import { Dispatch, FunctionComponent, SetStateAction } from "react";

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

  return (
    <div className="flex w-full flex-col">
      <h1 className="signup-heading">Criar uma conta</h1>

      <UserBioTextArea
        name="Conta-nos mais sobre ti. (Opcional)"
        placeholder=""
        className="h-40 lg:h-66"
        counterClassName="mt-2 text-right field-text"
        value={data.bio ? data.bio : ""}
        setValue={(bio) => setData((previous) => ({ ...previous, bio }))}
        limit={LIMIT}
        warningLimit={LIMIT - 30}
      />

      <PrimaryButton
        onClick={() => setCurrentStep(currentStep + 1)}
        variant="form"
        className="mt-8 h-12 w-full font-semibold lg:mt-10 lg:h-16 lg:text-xl"
      >
        Seguinte
      </PrimaryButton>
    </div>
  );
};
export default BioStep;
