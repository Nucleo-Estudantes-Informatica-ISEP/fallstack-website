"use client";

import { FunctionComponent } from "react";

import SponsorsContainer from "@/components/SponsorsContainer";
import type { SponsorDto } from "@/application/dto/sponsorDto";
import { Language } from "@/domain/i18n/translations";

const SponsorsSection: FunctionComponent<{
  language?: Language;
  sponsors: readonly SponsorDto[];
}> = ({ sponsors, language = Language.PT }) => {
  if (sponsors.length === 0) return null;

  return (
    <section className="flex flex-col items-center gap-y-10 border-b border-b-secondary bg-background text-center">
      <SponsorsContainer
        language={language}
        sponsors={sponsors.map(({ name, logo, website }) => ({
          name,
          logoHref: logo,
          website: website ?? undefined,
        }))}
      />
    </section>
  );
};

export default SponsorsSection;
