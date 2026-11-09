import { Suspense } from "react";
import { headers } from "next/headers";

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
<<<<<<< Updated upstream
=======

  // Alterar para true quando o utilizador tiver a inscrição feita
  const isRegistered = false; 

  // URLs corrigidos com base no teu mapa de pastas
  const buttonLink = isRegistered ? "/dashboard" : "/signup";

  const buttonText = isRegistered
    ? (language.startsWith('pt') ? 'Ver Perfil' : 'View Profile')
    : (language.startsWith('pt') ? 'Registar Agora' : 'Register Now');

    
>>>>>>> Stashed changes
  return (
    <CountdownLanding language={language}>
      <Suspense fallback={null}>
        <FeaturedCompanies language={language} />
      </Suspense>
    </CountdownLanding>
  );
};

export default App;
