import React from "react";
import { motion } from "framer-motion";

import Sponsor, { SponsorProps } from "../Sponsor";

interface SponsorsContainerProps {
  sponsors: SponsorProps[];
}
const SponsorsContainer: React.FC<SponsorsContainerProps> = ({ sponsors }) => {
  return (
    <motion.div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-secondary z-0 mx-2 mb-8 text-center text-5xl lg:mb-4">
        Agradecimentos
      </h2>
      <section className={`w-full rounded-3xl px-4`}>
        <div className="mx-auto flex w-full flex-wrap gap-4 sm:gap-6 md:gap-8 items-center justify-center md:w-5/6">
          {sponsors.map(({ name, logoHref, website }) => (
            <Sponsor
              key={name}
              logoHref={logoHref}
              name={name}
              website={website}
            />
          ))}
        </div>
      </section>
    </motion.div>
  );
};

export default SponsorsContainer;
