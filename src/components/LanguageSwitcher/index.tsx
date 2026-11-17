"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import useLanguage from "@/hooks/useLanguage";
import { ChevronDown, Globe } from "@/components/ui/Icons";

const languages = [
  { code: "pt", label: "Português", short: "PT" },
  { code: "en", label: "English", short: "EN" },
] as const;

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "";

  const currentLang = useLanguage();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const getTargetHref = (targetCode: string) => {
    if (pathname.startsWith("/event/pt") || pathname.startsWith("/event/en")) {
      return pathname.replace(/^\/event\/(pt|en)/, `/event/${targetCode}`);
    }
    return `/event/${targetCode}`;
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Selecionar idioma / Select language"
        className="ui-focus z-20 flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-white transition-colors hover:text-primary"
      >
        <Globe className="size-5" />
        <span className="text-xs font-semibold uppercase">
          {currentLang.toUpperCase()}
        </span>
        <ChevronDown
          className={`size-3 transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute top-full right-0 z-50 mt-1 min-w-[150px] rounded-lg border border-ui-border bg-ui-surface p-1.5 shadow-2xl backdrop-blur-md"
        >
          {languages.map((lang) => {
            const isActive = currentLang === lang.code;
            return (
              <Link
                key={lang.code}
                href={getTargetHref(lang.code)}
                role="menuitem"
                onClick={() => {
                  document.cookie = `fallstack-language=${lang.code}; Path=/; Max-Age=31536000; SameSite=Lax`;
                  setIsOpen(false);
                }}
                className={`ui-focus flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <span>{lang.label}</span>
                <span className="text-muted text-xs">{lang.short}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
