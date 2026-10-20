import { Suspense } from "react";
import { headers } from "next/headers";

import type { HomepageSections } from "@/components/Content";
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
  const sections = Object.fromEntries(
    (["schedule", "companies", "sponsors", "faqs"] as const).map((section) => [
      section,
      <Suspense
        key={section}
        fallback={<p role="status">A carregar / Loading…</p>}
      >
        <HomepageSection section={section} language={language} />
      </Suspense>,
    ])
  ) as HomepageSections;
  return <HomePage sections={sections} />;
};

export default App;
