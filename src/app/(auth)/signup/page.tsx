import { headers } from "next/headers";

import StudentSignUp from "@/components/StudentSignUp";
import { toInterestDto } from "@/application/dto/interestDto";
import { getInterests } from "@/application/services/interestService";
import { resolveLanguage } from "@/domain/i18n/translations";

export const dynamic = "force-dynamic";

const SignUpPage = async () => {
  const interests = await getInterests();
  const language = resolveLanguage((await headers()).get("accept-language"));
  return (
    <StudentSignUp
      interests={interests.map((interest) => toInterestDto(interest, language))}
    />
  );
};

export default SignUpPage;
