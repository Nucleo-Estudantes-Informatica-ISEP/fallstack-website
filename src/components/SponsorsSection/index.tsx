"use client";

import { FunctionComponent } from "react";

import SponsorsContainer from "@/components/SponsorsContainer";
import { edition } from "@/edition";

const SponsorsSection: FunctionComponent = () => {
  return (
    <section className="flex flex-col items-center gap-y-10 border-b border-b-secondary bg-background text-center">
      <SponsorsContainer sponsors={edition.sponsors} />
    </section>
  );
};

export default SponsorsSection;
