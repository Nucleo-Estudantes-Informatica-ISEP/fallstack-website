"use client";

import { useState } from "react";
import { MdOutlineArrowBack as BackIcon } from "react-icons/md";

import type { StudentSignUpData } from "@/types/StudentSignUpData";
import AccountDetailsStep from "@/components/SignUp/AccountDetailsStep";
import BioStep from "@/components/SignUp/BioStep";
import FinalStep from "@/components/SignUp/FinalStep";
import InterestsStep from "@/components/SignUp/InterestsStep";
import NameStep from "@/components/SignUp/NameStep";
import type { InterestDto } from "@/application/dto/interestDto";

interface StudentSignUpProps {
  interests: InterestDto[];
}

const StudentSignUp = ({ interests }: StudentSignUpProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<StudentSignUpData>({} as StudentSignUpData);

  const steps = [
    <NameStep key="name" {...{ currentStep, setCurrentStep, data, setData }} />,
    <AccountDetailsStep
      key="account"
      {...{ currentStep, setCurrentStep, data, setData }}
    />,
    <BioStep key="bio" {...{ currentStep, setCurrentStep, data, setData }} />,
    <InterestsStep
      key="interests"
      availableInterests={interests}
      {...{ currentStep, setCurrentStep, data, setData }}
    />,
    <FinalStep
      key="final"
      {...{ currentStep, setCurrentStep, data, setData }}
    />,
  ];

  return (
    <div className="relative max-h-[90vh] w-full overflow-hidden md:mt-4">
      {currentStep > 0 && (
        <button
          onClick={() => setCurrentStep(currentStep - 1)}
          className="absolute -top-12 -left-2 rounded-full text-3xl text-secondary"
        >
          <BackIcon />
        </button>
      )}
      <section className="flex max-h-[85vh] flex-col overflow-y-auto">
        {steps[currentStep]}
      </section>
    </div>
  );
};

export default StudentSignUp;
