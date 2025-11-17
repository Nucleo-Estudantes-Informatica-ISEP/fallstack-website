"use client";

import { FunctionComponent } from "react";

import { Sponsors } from "@/utils/Sponsors";
import SponsorsContainer from "@/components/SponsorsContainer";

const SponsorsSection: FunctionComponent = () => {
  return (
    <section className="flex flex-col items-center gap-y-10 border-b border-b-secondary bg-background text-center">
      <SponsorsContainer sponsors={Sponsors} />
    </section>
  );
};

export default SponsorsSection;
