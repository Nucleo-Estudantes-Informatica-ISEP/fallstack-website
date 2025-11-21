"use client";

import { useState } from "react";
import { MdOutlineArrowBack as BackIcon } from "react-icons/md";

import { StudentSignUpData } from "@/types/StudentSignUpData";
import AccountDetailsStep from "@/components/SignUp/AccountDetailsStep";
import BioStep from "@/components/SignUp/BioStep";
import FinalStep from "@/components/SignUp/FinalStep";
import InterestsStep from "@/components/SignUp/InterestsStep";
import NameStep from "@/components/SignUp/NameStep";

const SignUpPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<StudentSignUpData>({} as StudentSignUpData);

  const steps = [
    <NameStep key={"0"} {...{ currentStep, setCurrentStep, data, setData }} />,
    <AccountDetailsStep
      key={"1"}
      {...{ currentStep, setCurrentStep, data, setData }}
    />,
    <BioStep key={"2"} {...{ currentStep, setCurrentStep, data, setData }} />,
    <InterestsStep
      key={"3"}
      {...{ currentStep, setCurrentStep, data, setData }}
    />,
    <FinalStep key={"4"} {...{ currentStep, setCurrentStep, data, setData }} />,
  ];

  const handlePrev = () => setCurrentStep(currentStep - 1);

  return (
    <div className="relative w-full max-h-[90vh] overflow-hidden md:mt-4">
      {currentStep > 0 && (
        <button
          onClick={handlePrev}
          className="absolute -left-2 -top-12 rounded-full text-3xl text-secondary"
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

export default SignUpPage;
