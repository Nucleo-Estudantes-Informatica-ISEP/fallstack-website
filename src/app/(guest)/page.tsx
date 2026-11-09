import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";

import CountdownLanding from "@/components/CountdownLanding";
import FeaturedCompanies from "@/components/FeaturedCompanies";
import { resolveRequestLanguage } from "@/domain/i18n/translations";

interface AppProps {
  searchParams: Promise<{ lang?: string | string[] }>;
}

const App = async ({ searchParams }: AppProps) => {
  const { lang } = await searchParams;

  const language = resolveRequestLanguage(
    lang,
    (await headers()).get("accept-language")
  );

  // Alterar para true quando o utilizador tiver a inscrição feita
  const isRegistered = false;

  // URLs corrigidos com base no teu mapa de pastas
  const buttonLink = isRegistered ? "/dashboard" : "/signup";

  const buttonText = isRegistered
    ? language.startsWith("pt")
      ? "Ver Perfil"
      : "View Profile"
    : language.startsWith("pt")
      ? "Registar Agora"
      : "Register Now";

  return (
    <>
      <CountdownLanding language={language}>
        {/* Botão Dinâmico (Task 14) */}
        <div className="my-6 flex justify-center">
          <Link
            href={buttonLink}
            className="transform rounded-full bg-orange-600 px-8 py-3 font-bold text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-orange-700"
          >
            {buttonText}
          </Link>
        </div>

        <Suspense fallback={null}>
          <FeaturedCompanies language={language} />
        </Suspense>
      </CountdownLanding>
    </>
  );
};

export default App;
