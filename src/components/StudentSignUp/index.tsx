"use client";

import { useEffect, useState } from "react";
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
}

// Wizard data collected before an AuthNEI redirect is stashed here so it can
// be restored once the browser comes back from the OAuth flow — that's a
// full page navigation away from and back to this app, which clears React
// state, unlike the rest of this wizard's in-memory step transitions.
const AUTHNEI_DRAFT_STORAGE_KEY = "authnei-signup-draft";

const StudentSignUp = ({ interests }: StudentSignUpProps) => {
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

    if (saved) {
      try {
        setData((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {
        // Ignore malformed/stale storage and continue with a blank draft.
      }
    }

    setAuthNeiMode(true);
    setCurrentStep(1);
  }, []);

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
