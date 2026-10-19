import { headers } from "next/headers";

import HomePage from "@/components/HomePage";
import { getHomepageData } from "@/application/services/publicEditionService";
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
  const data = await getHomepageData(language);
  return <HomePage data={data} />;
};

export default App;
