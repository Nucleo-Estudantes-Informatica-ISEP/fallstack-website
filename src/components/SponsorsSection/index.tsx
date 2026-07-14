"use client";

import { FunctionComponent, useEffect, useState } from "react";

import { httpClient } from "@/lib/http/client";
import SponsorsContainer from "@/components/SponsorsContainer";
import type { SponsorDto } from "@/application/dto/sponsorDto";

const SponsorsSection: FunctionComponent = () => {
  const [sponsors, setSponsors] = useState<SponsorDto[] | null>(null);

  useEffect(() => {
    httpClient
      .get<SponsorDto[]>("/sponsors")
      .then(setSponsors)
      .catch(() => setSponsors([]));
  }, []);

  if (!sponsors) return null;

  return (
    <section className="flex flex-col items-center gap-y-10 border-b border-b-secondary bg-background text-center">
      <SponsorsContainer
        sponsors={sponsors.map(({ name, logo, website }) => ({
          name,
          logoHref: logo,
          website: website ?? "",
        }))}
      />
    </section>
  );
};

export default SponsorsSection;
