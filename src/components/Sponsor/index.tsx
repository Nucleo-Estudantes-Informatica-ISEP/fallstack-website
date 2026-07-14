"use client";

import React from "react";
import Image from "next/image";

export interface SponsorProps {
  logoHref: string;
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
      <div className="relative h-[85%] w-[85%] sm:h-[90%] sm:w-[90%]">
        <Image
          className="rounded-[5px] object-contain"
          src={logoHref}
          alt={name}
          fill
          sizes="(min-width: 1024px) 12rem, (min-width: 768px) 10rem, (min-width: 640px) 8rem, 6rem"
        />
      </div>
    </a>
  );
};

export default Sponsor;
