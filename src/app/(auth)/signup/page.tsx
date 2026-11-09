import { headers } from "next/headers";

import StudentSignUp from "@/components/StudentSignUp";
import { toInterestDto } from "@/application/dto/interestDto";
import { getInterests } from "@/application/services/interestService";
import getServerSession from "@/application/services/sessionService";
import { resolveRequestLanguage } from "@/domain/i18n/translations";

export const dynamic = "force-dynamic";

interface SignUpPageProps {
  searchParams: Promise<{
    lang?: string | string[];
    authnei?: string | string[];
  }>;
}

const SignUpPage = async ({ searchParams }: SignUpPageProps) => {
  const { lang, authnei } = await searchParams;
  const [interests, session] = await Promise.all([
    getInterests(),
    authnei === "1" ? getServerSession() : null,
  ]);
  const language = resolveRequestLanguage(
    lang,
    (await headers()).get("accept-language")
  );
  return (
    <StudentSignUp
      institutionalEmail={
        session?.role === "STUDENT" ? session.email : undefined
      }
      interests={interests.map((interest) => toInterestDto(interest, language))}
    />
  );
};

export default SignUpPage;
