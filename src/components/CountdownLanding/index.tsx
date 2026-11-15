"use client";

import { FunctionComponent, ReactNode, useEffect, useState } from "react";
import NeiLogoSimplifiedWhite from "~/public/assets/images/logo-simplified-white.png";

import Footer from "@/components/Footer";
import HeroContainer from "@/components/HeroContainer";
import { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

interface CountdownLandingProps {
  language: Language;
  // Rendered inside the banner, below the identity and the countdown, so it
  // stays within the first screen on mobile and above the featured partners.
  callToAction?: ReactNode;
  children?: ReactNode;
}

const CountdownLanding: FunctionComponent<CountdownLandingProps> = ({
  language,
  callToAction,
  children,
}) => {
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
    { label: isEnglish ? "days" : "dias", seconds: 86400, modulo: Infinity },
    { label: isEnglish ? "hours" : "horas", seconds: 3600, modulo: 24 },
  ];

  return (
    <HeroContainer>
      {/* shortcut: artwork includes the 2026 logo; export a fresh frame for a later edition. */}
      <section className="relative h-svh min-h-160 w-full bg-background bg-[url('/assets/images/landing-2026.png')] bg-cover bg-center">
        <div className="sr-only">
          <h1>
            {branding.name} {branding.year}
          </h1>
          <p>
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
        {/* The countdown and the call to action share one column so they can
            never overlap, whatever the viewport height. Without a call to
            action the countdown keeps its original position. */}
        <div
          className={`absolute inset-x-4 flex flex-col items-center gap-4 sm:gap-6 ${
            callToAction ? "bottom-[max(1rem,3%)]" : "bottom-[13.85%]"
          }`}
        >
          <dl
            role="timer"
            aria-label={
              isEnglish ? "Time until Fallstack" : "Tempo até ao Fallstack"
            }
            className="flex w-full flex-wrap justify-center gap-3 font-title text-[clamp(1.5rem,4.3vw,4rem)] leading-none text-white sm:gap-x-6"
          >
            {units.map(({ label, seconds, modulo }) => (
              <div key={label} className="flex gap-1.5 sm:gap-2">
                <dt className="order-last flex h-[clamp(3rem,6.3vw,5.9375rem)] items-center rounded-xl bg-background px-[clamp(0.5rem,1.3vw,1.25rem)] sm:rounded-3xl">
                  {label}
                </dt>
                <dd className="flex gap-1.5 tabular-nums sm:gap-2">
                  {(remaining === null
                    ? "--"
                    : String(Math.floor(remaining / seconds) % modulo).padStart(
                        2,
                        "0"
                      )
                  )
                    .split("")
                    .map((digit, index) => (
                      <span
                        key={index}
                        className="flex h-[clamp(3rem,6.3vw,5.9375rem)] w-[clamp(2rem,7.2vw,6.75rem)] items-center justify-center rounded-xl bg-background sm:rounded-3xl"
                      >
                        {digit}
                      </span>
                    ))}
                </dd>
              </div>
            ))}
          </dl>
          {callToAction}
        </div>
        <p className="sr-only">
          {isEnglish
            ? "We're preparing the next edition. The programme, companies and more details will be announced soon."
            : "Estamos a preparar a próxima edição. O programa, as empresas e mais novidades serão anunciados em breve."}
        </p>
      </section>
      {children}
      <Footer neiLogoSrc={NeiLogoSimplifiedWhite} landing />
    </HeroContainer>
  );
};

export default CountdownLanding;
