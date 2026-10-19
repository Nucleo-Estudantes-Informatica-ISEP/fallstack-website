"use client";

import { FunctionComponent } from "react";

import SponsorsContainer from "@/components/SponsorsContainer";
import type { SponsorDto } from "@/application/dto/sponsorDto";

const SponsorsSection: FunctionComponent<{ sponsors: SponsorDto[] }> = ({
  sponsors,
}) => {
  return (
    <section className="flex flex-col items-center gap-y-10 border-b border-b-secondary bg-background text-center">
      <SponsorsContainer
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
