"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

import useLanguage from "@/hooks/useLanguage";
import { uiText } from "@/domain/i18n/ui";

const UiLanguageContext = createContext("pt");

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const language = useLanguage();
  return (
    <UiLanguageContext.Provider value={language}>
      {children}
    </UiLanguageContext.Provider>
  );
}

export function useUiText() {
  const language = useContext(UiLanguageContext);
  return useCallback(
    (text: string, values?: Record<string, string | number>) =>
      uiText(language, text, values),
    [language]
  );
}
