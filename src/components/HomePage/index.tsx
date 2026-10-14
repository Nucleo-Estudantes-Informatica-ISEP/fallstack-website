"use client";

import { FunctionComponent, useEffect, useState } from "react";
import NeiLogoSimplifiedWhite from "~/public/assets/images/logo-white.png";

import Footer from "@/components/Footer";
import HeroContainer from "@/components/HeroContainer";
import { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

interface HomePageProps {
  language: Language;
}

const HomePage: FunctionComponent<HomePageProps> = ({ language }) => {
  const [remaining, setRemaining] = useState<number | null>(null);
  const isEnglish = language === Language.EN;

  useEffect(() => {
    const update = () =>
      setRemaining(
        Math.max(
          0,
          Math.ceil((Date.parse(branding.event.startsAt) - Date.now()) / 1000)
        )
      );
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const units = [
    { label: isEnglish ? "Days" : "Dias", seconds: 86400, modulo: Infinity },
    { label: isEnglish ? "Hours" : "Horas", seconds: 3600, modulo: 24 },
    { label: isEnglish ? "Minutes" : "Minutos", seconds: 60, modulo: 60 },
    { label: isEnglish ? "Seconds" : "Segundos", seconds: 1, modulo: 60 },
  ];

  return (
    <HeroContainer>
      <section className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background bg-[url('/assets/images/bgHero.svg')] bg-cover bg-center px-4 pt-24 pb-12 text-center">
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-7xl">
            {branding.name} {branding.year}
          </h1>
          <p className="text-lg text-primary sm:text-xl">
            <time dateTime={branding.event.startsAt}>
              {new Intl.DateTimeFormat(isEnglish ? "en-GB" : "pt-PT", {
                dateStyle: "long",
                timeZone: "Europe/Lisbon",
              }).format(new Date(branding.event.startsAt))}
            </time>
            {" · "}
            {branding.event.venue}
          </p>
        </div>
        <div
          role="timer"
          aria-label={
            isEnglish ? "Time until Fallstack" : "Tempo até ao Fallstack"
          }
        >
          <dl className="grid grid-cols-4 gap-2 sm:gap-4">
            {units.map(({ label, seconds, modulo }) => (
              <div
                key={label}
                className="flex min-w-16 flex-col-reverse gap-2 rounded-xl border border-white/20 bg-background/80 px-2 py-5 sm:min-w-28 sm:px-5"
              >
                <dt className="text-xs text-white/80 sm:text-sm">{label}</dt>
                <dd className="text-3xl font-semibold text-primary tabular-nums sm:text-5xl">
                  {remaining === null
                    ? "--"
                    : String(Math.floor(remaining / seconds) % modulo).padStart(
                        2,
                        "0"
                      )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="max-w-lg text-base leading-relaxed text-balance text-white/80 sm:text-lg">
          {isEnglish
            ? "We're preparing the next edition. The programme, companies and more details will be announced soon."
            : "Estamos a preparar a próxima edição. O programa, as empresas e mais novidades serão anunciados em breve."}
        </p>
      </section>
      <Footer neiLogoSrc={NeiLogoSimplifiedWhite} />
    </HeroContainer>
  );
};

export default HomePage;
