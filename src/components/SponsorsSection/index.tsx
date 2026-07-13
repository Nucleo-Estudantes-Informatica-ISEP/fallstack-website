"use client";

import { FunctionComponent } from "react";

import SponsorsContainer from "@/components/SponsorsContainer";
import { Sponsors } from "@/utils/Sponsors";

const SponsorsSection: FunctionComponent = () => {
  return (
    <section className="flex flex-col items-center gap-y-10 border-b border-b-secondary bg-background text-center">
      <SponsorsContainer sponsors={Sponsors} />
    </section>
  );
};

export default SponsorsSection;
