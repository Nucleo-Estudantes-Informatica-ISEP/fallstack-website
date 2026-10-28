import { headers } from "next/headers";

import CountdownLanding from "@/components/CountdownLanding";
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
  return <CountdownLanding language={language} />;
};

export default App;
