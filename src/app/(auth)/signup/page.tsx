import { headers } from "next/headers";

import StudentSignUp from "@/components/StudentSignUp";
import { toInterestDto } from "@/application/dto/interestDto";
import { getInterests } from "@/application/services/interestService";
import { resolveRequestLanguage } from "@/domain/i18n/translations";

export const dynamic = "force-dynamic";

interface SignUpPageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const SignUpPage = async ({ searchParams }: SignUpPageProps) => {
  const interests = await getInterests();
  const { lang } = await searchParams;
  const language = resolveRequestLanguage(
    lang,
    (await headers()).get("accept-language")
  );
  return (
    <StudentSignUp
      interests={interests.map((interest) => toInterestDto(interest, language))}
    />
  );
};

export default SignUpPage;
