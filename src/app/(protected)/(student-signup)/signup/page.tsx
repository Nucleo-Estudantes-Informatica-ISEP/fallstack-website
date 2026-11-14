import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { serverEnv } from "@/config/env.server";
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

  // Students who already have a profile retain access during offseason.
  if (session?.role === "STUDENT" && session.student) {
    redirect(`/student/${session.student.code}`);
  }

  // Block new registrations, including unauthenticated visitors.
  if (serverEnv.EVENT_MODE === "offseason") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">
          Inscrições encerradas
        </h1>

        <p className="text-gray-300">
          As inscrições para esta edição do Fallstack terminaram. Voltamos em
          breve com novidades.
        </p>
      </main>
    );
  }

  // Normal registration flow while the event is active.
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

  const { lang } = await searchParams;
  const interests = await getInterests();

  const language = resolveRequestLanguage(
    lang,
    (await headers()).get("accept-language")
  );

  return (
    <StudentSignUp
      institutionalEmail={session.email}
      authName={session.authName}
      interests={interests.map((interest) => toInterestDto(interest, language))}
    />
  );
};

export default SignUpPage;
