"use client";

import { FunctionComponent } from "react";

import SponsorsContainer from "@/components/SponsorsContainer";
import { edition } from "@/edition";

const SponsorsSection: FunctionComponent = () => {
  return (
    <section className="border-b-secondary bg-background flex flex-col items-center gap-y-10 border-b text-center">
      <SponsorsContainer sponsors={edition.sponsors} />
    </section>
  );
};

export default SponsorsSection;
