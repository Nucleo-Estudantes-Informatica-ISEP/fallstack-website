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
  return (
    <CountdownLanding language={language}>
      <Suspense fallback={null}>
        <FeaturedCompanies language={language} />
      </Suspense>
    </CountdownLanding>
  );
};

export default App;
