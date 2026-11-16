"use client";

import { FunctionComponent, useRef } from "react";
import NeiLogoSimplifiedWhite from "~/public/assets/images/logo-simplified-white.png";

import Content, { type HomepageSections } from "@/components/Content";
import Footer from "@/components/Footer";
import GenericContainer from "@/components/GenericContainer";
import HeadsUp from "@/components/HeadsUp";
import Hero from "@/components/Hero";
import HeroContainer from "@/components/HeroContainer";
import { Language } from "@/domain/i18n/translations";

interface HomePageProps {
  language: Language;
  sections: HomepageSections;
}

const HomePage: FunctionComponent<HomePageProps> = ({ language, sections }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <HeroContainer>
      <GenericContainer>
        <Hero contentRef={contentRef} language={language} />
        <Content contentRef={contentRef} sections={sections} />
        <HeadsUp />
        <Footer neiLogoSrc={NeiLogoSimplifiedWhite} />
      </GenericContainer>
    </HeroContainer>
  );
};

export default HomePage;
