import { headers } from "next/headers";

import HomePage from "@/components/HomePage";
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
  return <HomePage language={language} />;
};

export default App;
