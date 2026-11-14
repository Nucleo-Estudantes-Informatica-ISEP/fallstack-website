"use client";

import { useEffect, useRef, useState } from "react";

import type { StudentSignUpData } from "@/types/StudentSignUpData";
import AccountDetailsStep from "@/components/SignUp/AccountDetailsStep";
import BioStep from "@/components/SignUp/BioStep";
import FinalStep from "@/components/SignUp/FinalStep";
import InterestsStep from "@/components/SignUp/InterestsStep";
import type { InterestDto } from "@/application/dto/interestDto";

interface StudentSignUpProps {
  interests: InterestDto[];
  institutionalEmail: string;
  /** Verified display name from AuthNEI, when the identity has one. */
  authName?: string;
}

const StudentSignUp = ({
  interests,
  institutionalEmail,
  authName,
}: StudentSignUpProps) => {
  const stepRef = useRef<HTMLElement>(null);
  const previousStep = useRef(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<StudentSignUpData>({
    name: null,
    email: null,
    password: null,
    bio: "",
    interests: [],
    cv: null,
    avatar: null,
    year: null,
    linkedin: null,
  });

  useEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    const step = stepRef.current;
    if (!step) return;
    step.focus({ preventScroll: true });
    if (
      step.getBoundingClientRect().top < 0 ||
      step.getBoundingClientRect().top > window.innerHeight / 2
    ) {
      step.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [currentStep]);

  const steps = [
    <AccountDetailsStep
      key="account"
      institutionalEmail={institutionalEmail}
      needsName={!authName}
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
    <section
      ref={stepRef}
      tabIndex={-1}
      aria-label="Registo de estudante"
      className="student-signup-form relative mx-auto w-full max-w-[567px] field-focus-target outline-none"
    >
      {steps[currentStep]}
      {currentStep > 0 && (
        <button
          type="button"
          onClick={() => setCurrentStep(currentStep - 1)}
          className="mt-2 flex min-h-11 items-center rounded-sm text-sm text-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:absolute lg:top-full"
        >
          Voltar
        </button>
      )}
    </section>
  );
};

export default StudentSignUp;
