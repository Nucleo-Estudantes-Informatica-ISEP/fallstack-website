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

  
  const isRegistered = false;

  
  const buttonLink = isRegistered ? "/dashboard" : "/signup";

  
  const isPt = language.startsWith("pt");
  const buttonText = isRegistered 
    ? (isPt ? "Ver Perfil" : "View Profile") 
    : (isPt ? "Registar Agora" : "Register Now");

  return (
    <CountdownLanding language={language}>
      <div className="flex justify-center w-full my-8">
        <Link
          href={buttonLink}
          className="px-8 py-3 text-base font-medium text-white bg-[#111111] rounded-xl transition-all duration-200 hover:bg-black hover:scale-105 active:scale-95 shadow-md inline-block"
        >
          {buttonText}
        </Link>
      </div>

      <Suspense fallback={null}>
        <FeaturedCompanies language={language} />
      </Suspense>
    </CountdownLanding>
  );
};

export default App;

