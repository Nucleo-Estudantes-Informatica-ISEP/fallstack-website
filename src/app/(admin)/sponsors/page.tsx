import React from "react";

import SponsorAdminSection from "@/components/SponsorAdminSection";
import { toAdminSponsorDto } from "@/application/dto/sponsorDto";
import { listSponsorsForAdmin } from "@/application/services/sponsorService";

const SponsorsAdminPage = async () => {
  const sponsors = await listSponsorsForAdmin();

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center px-8 py-24 md:px-24">
      <SponsorAdminSection sponsors={sponsors.map(toAdminSponsorDto)} />
    </section>
  );
};

export default SponsorsAdminPage;
