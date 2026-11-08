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
    ? (language.startsWith('pt') ? 'Ver Perfil' : 'View Profile')
    : (language.startsWith('pt') ? 'Registar Agora' : 'Register Now');

  return (
    <>
      <CountdownLanding language={language}>
        {/* Botão Dinâmico (Task 14) */}
        <div className="flex justify-center my-6">
          <Link 
            href={buttonLink}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 transform hover:scale-105 shadow-lg"
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
