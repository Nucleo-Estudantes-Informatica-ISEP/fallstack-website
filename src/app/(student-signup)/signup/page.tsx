import { headers } from "next/headers";
import { redirect } from "next/navigation";

import AuthNeiButton from "@/components/AuthNeiButton";
import StudentSignUp from "@/components/StudentSignUp";
import { toInterestDto } from "@/application/dto/interestDto";
import { getInterests } from "@/application/services/interestService";
import getServerSession from "@/application/services/sessionService";
import { resolveRequestLanguage } from "@/domain/i18n/translations";

export const dynamic = "force-dynamic";

interface SignUpPageProps {
  searchParams: Promise<{
    lang?: string | string[];
  }>;
}

const SignUpPage = async ({ searchParams }: SignUpPageProps) => {
  const session = await getServerSession();
  if (!session) {
    return (
      <section className="student-signup-form mx-auto w-full max-w-[567px]">
        <h1 className="signup-heading">Criar uma conta</h1>
        <p className="mb-6 text-base leading-relaxed text-gray-300">
          Continua com o AuthNEI para depois completares o teu perfil no
          Fallstack.
        </p>
        <AuthNeiButton next="/signup" />
      </section>
    );
  }

  if (session.role !== "STUDENT") redirect("/");
  if (session.student) redirect(`/student/${session.student.code}`);

  const { lang } = await searchParams;
  const interests = await getInterests();
  const language = resolveRequestLanguage(
    lang,
    (await headers()).get("accept-language")
  );
  return (
    <StudentSignUp
      institutionalEmail={session.email}
      interests={interests.map((interest) => toInterestDto(interest, language))}
    />
  );
};

export default SignUpPage;
