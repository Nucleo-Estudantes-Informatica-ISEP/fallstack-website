import React from "react";

import SponsorAdminSection from "@/components/SponsorAdminSection";
import Custom404 from "@/app/not-found";
import { toAdminSponsorDto } from "@/application/dto/sponsorDto";
import getServerSession from "@/application/services/sessionService";
import { listSponsorsForAdmin } from "@/application/services/sponsorService";

const SponsorsAdminPage = async () => {
  const session = await getServerSession();

  if (!session || !session.isAdmin) {
    return Custom404();
  }

  const sponsors = await listSponsorsForAdmin();

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center px-8 py-24 md:px-24">
      <SponsorAdminSection sponsors={sponsors.map(toAdminSponsorDto)} />
    </section>
  );
};

export default SponsorsAdminPage;
