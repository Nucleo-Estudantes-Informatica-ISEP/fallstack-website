"use client";

import { useEffect } from "react";

import useLanguage from "@/hooks/useLanguage";

export default function LanguageSync() {
  const currentLang = useLanguage();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = currentLang === "en" ? "en" : "pt";
    }
  }, [currentLang]);

  return null;
}
