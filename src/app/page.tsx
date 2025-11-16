"use client";

import { FunctionComponent, useRef } from "react";
import LogoWhite from "~/public/assets/images/logo_white.svg";
import NeiLogoWhite from "~/public/assets/images/logo-simplified-white.png";

import Content from "@/components/Content";
import Footer from "@/components/Footer";
import GenericContainer from "@/components/GenericContainer";
import HeadsUp from "@/components/HeadsUp";
import Hero from "@/components/Hero";
import HeroContainer from "@/components/HeroContainer";

const App: FunctionComponent = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <HeroContainer>
      <GenericContainer>
        <Hero
          logoSrc={LogoWhite}
          logoAlt="Logo principal do evento Fall-Stack 2025"
          contentRef={contentRef}
        />
        <Content contentRef={contentRef} />
        <HeadsUp />
        <Footer neiLogoSrc={NeiLogoWhite} />
      </GenericContainer>
    </HeroContainer>
  );
};

export default App;
