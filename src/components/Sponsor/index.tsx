"use client";

import React from "react";
import Image, { StaticImageData } from "next/image";

export interface SponsorProps {
  logoHref: StaticImageData;
  name: string;
  website: string;
}

const Sponsor: React.FC<SponsorProps> = ({ logoHref, name, website }) => {
  return (
    <a
      target="_blank"
      href={website}
      className="mx-2 flex h-24 w-24 items-center justify-center transition duration-300 ease-in-out hover:scale-105 sm:h-32 sm:w-32 md:h-40 md:w-40 lg:size-48"
      rel="noreferrer"
    >
      <Image
        className="mx-auto h-auto max-h-[85%] max-w-[85%] rounded-[5px] object-contain sm:max-h-[90%] sm:max-w-[90%]"
        src={logoHref}
        alt={name}
      />
    </a>
  );
};

export default Sponsor;
