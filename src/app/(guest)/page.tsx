import { Suspense } from "react";
import { headers } from "next/headers";

import { serverEnv } from "@/config/env.server";
import type { HomepageSections } from "@/components/Content";
import CountdownLanding from "@/components/CountdownLanding";
import FeaturedCompanies from "@/components/FeaturedCompanies";
import HomePage from "@/components/HomePage";
import HomepageSection from "@/components/HomepageSection";
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
  if (serverEnv.SHOWCASE_FULL_WEBSITE) {
    const sections = Object.fromEntries(
      (["schedule", "companies", "sponsors", "faqs"] as const).map(
        (section) => [
          section,
          <Suspense
            key={section}
            fallback={<p role="status">A carregar / Loading…</p>}
          >
            <HomepageSection section={section} language={language} />
          </Suspense>,
        ]
      )
    ) as HomepageSections;
    return <HomePage sections={sections} />;
  }
  return (
    <CountdownLanding language={language}>
      <Suspense fallback={null}>
        <FeaturedCompanies language={language} />
      </Suspense>
    </CountdownLanding>
  );
};

export default App;
