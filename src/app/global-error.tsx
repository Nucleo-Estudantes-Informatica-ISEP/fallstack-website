"use client";

import { useEffect } from "react";

import { useUiText } from "@/contexts/UiLanguageContext";
import UiText from "@/components/ui/UiText";

import * as Sentry from "@sentry/nextjs";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useUiText();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt">
      <body>
        <main
          data-testid="global-error"
          className="artwork-clean artwork-readable flex min-h-screen w-full flex-col items-center justify-center gap-6 px-4 text-center"
        >
          <h1 className="text-3xl font-semibold sm:text-4xl md:text-6xl">
            Algo correu mal.
          </h1>
          <p className="text-2xl font-normal">
            {t("Tenta novamente ou volta à página inicial.")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button type="button" onClick={() => reset()} className="ui-action">
              {" "}
              <UiText text="Tentar novamente" />{" "}
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="ui-action no-underline">
              {t("Página inicial")}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
