"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function useLanguage() {
  const pathname = usePathname();
  const [savedLanguage, setSavedLanguage] = useState("pt");
  const routeLanguage = pathname?.match(/^\/event\/(pt|en)(?:\/|$)/)?.[1];

  useEffect(() => {
    const saved = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("fallstack-language="))
      ?.split("=")[1];
    setSavedLanguage(saved === "en" ? "en" : "pt");
  }, [pathname]);

  return routeLanguage ?? savedLanguage;
}
