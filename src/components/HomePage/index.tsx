"use client";

import { FunctionComponent, useRef } from "react";
import LogoWhite from "~/public/assets/images/logo_white.svg";
import NeiLogoSimplifiedWhite from "~/public/assets/images/logo-white.png";

import Content from "@/components/Content";
import Footer from "@/components/Footer";
import GenericContainer from "@/components/GenericContainer";
import HeadsUp from "@/components/HeadsUp";
import Hero from "@/components/Hero";
import HeroContainer from "@/components/HeroContainer";
import type { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

interface HomePageProps {
  language: Language;
}

const HomePage: FunctionComponent<HomePageProps> = ({ language }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <HeroContainer>
      <GenericContainer>
        <Hero
          logoSrc={LogoWhite}
          logoAlt={branding.heroLogoAlt}
          contentRef={contentRef}
        />
        <Content contentRef={contentRef} language={language} />
        <HeadsUp />
        <Footer neiLogoSrc={NeiLogoSimplifiedWhite} />
      </GenericContainer>
    </HeroContainer>
  );
};

export default HomePage;
