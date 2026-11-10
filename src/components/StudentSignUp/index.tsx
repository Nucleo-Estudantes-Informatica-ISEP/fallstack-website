"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MdOutlineArrowBack as BackIcon } from "react-icons/md";
import { toast } from "react-toastify";

import type { StudentSignUpData } from "@/types/StudentSignUpData";
import useSession from "@/hooks/useSession";
import AccountDetailsStep from "@/components/SignUp/AccountDetailsStep";
import BioStep from "@/components/SignUp/BioStep";
import FinalStep from "@/components/SignUp/FinalStep";
import InterestsStep from "@/components/SignUp/InterestsStep";
import NameStep from "@/components/SignUp/NameStep";
import type { InterestDto } from "@/application/dto/interestDto";

interface StudentSignUpProps {
  interests: InterestDto[];
  institutionalEmail?: string;
}

// Wizard data collected before an AuthNEI redirect is stashed here so it can
// be restored once the browser comes back from the OAuth flow — that's a
// full page navigation away from and back to this app, which clears React
// state, unlike the rest of this wizard's in-memory step transitions.
const AUTHNEI_DRAFT_STORAGE_KEY = "authnei-signup-draft";

const StudentSignUp = ({
  interests,
  institutionalEmail,
}: StudentSignUpProps) => {
  const stepRef = useRef<HTMLElement>(null);
  const previousStep = useRef(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<StudentSignUpData>({} as StudentSignUpData);
  const [authNeiMode, setAuthNeiMode] = useState(false);
  const session = useSession();
  const router = useRouter();

  // A session already exists for a non-student account (e.g. an employee or
  // admin browsing this public page). Bounce them away immediately instead
  // of letting them fill out all 5 steps only to fail on the final submit.
  useEffect(() => {
    if (session.user && session.user.role !== "STUDENT") {
      toast.error("Já tens sessão iniciada como outro tipo de conta.");
      router.replace("/");
    }
  }, [session.user, router]);

  // Detect a return from a successful AuthNEI sign-in (see
  // src/app/auth/callback/route.ts) and resume the wizard at the account
  // details step, skipping the email/password fields since Supabase already
  // has an authenticated identity for this student.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("authnei") !== "1")
      return;

    const saved = window.sessionStorage.getItem(AUTHNEI_DRAFT_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTHNEI_DRAFT_STORAGE_KEY);
    let hasSavedName = false;

    if (saved) {
      try {
        const draft = JSON.parse(saved) as { name?: unknown };
        const savedName = draft.name;
        if (typeof savedName === "string" && savedName.trim().length > 0) {
          hasSavedName = true;
          setData((prev) => ({ ...prev, name: savedName }));
        }
      } catch {
        // Ignore malformed/stale storage and continue with a blank draft.
      }
    }

    setAuthNeiMode(true);
    // Login-started AuthNEI flows have no wizard draft, so still collect the
    // required name. Signup-started flows already stashed it before redirect.
    setCurrentStep(hasSavedName ? 1 : 0);
  }, []);

  useEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    const step = stepRef.current;
    if (!step) return;
    step.focus({ preventScroll: true });
    if (
      step.getBoundingClientRect().top < 64 ||
      step.getBoundingClientRect().top > window.innerHeight / 2
    ) {
      step.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [currentStep]);

  const stashDraftForAuthNei = () => {
    window.sessionStorage.setItem(
      AUTHNEI_DRAFT_STORAGE_KEY,
      JSON.stringify({ name: data.name })
    );
  };

  const steps = [
    <NameStep key="name" {...{ currentStep, setCurrentStep, data, setData }} />,
    <AccountDetailsStep
      key="account"
      authNeiMode={authNeiMode}
      institutionalEmail={institutionalEmail}
      onAuthNeiRedirect={stashDraftForAuthNei}
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
      {currentStep > 0 && (
        <button
          type="button"
          onClick={() => setCurrentStep(currentStep - 1)}
          className="mb-2 flex min-h-11 items-center gap-2 rounded-sm text-sm text-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:absolute lg:bottom-full"
        >
          <BackIcon aria-hidden="true" />
          Voltar
        </button>
      )}
      {steps[currentStep]}
    </section>
  );
};

export default StudentSignUp;
