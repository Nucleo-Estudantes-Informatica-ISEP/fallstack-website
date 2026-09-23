"use client";

import React from "react";
import Image from "next/image";

export interface SponsorProps {
  logoHref: string;
  name: string;
  website?: string;
}

const Sponsor: React.FC<SponsorProps> = ({ logoHref, name, website }) => {
  const className =
    "mx-2 flex h-24 w-24 items-center justify-center transition duration-300 ease-in-out hover:scale-105 sm:h-32 sm:w-32 md:h-40 md:w-40 lg:size-48";
  const logo = (
    <div className="relative size-[85%] sm:size-[90%]">
      <Image
        className="rounded-[5px] object-contain"
        src={logoHref}
        alt={name}
        fill
        sizes="(min-width: 1024px) 12rem, (min-width: 768px) 10rem, (min-width: 640px) 8rem, 6rem"
      />
    </div>
  );

  // A sponsor without a website (e.g. one just created via the admin form,
  // which doesn't require it) renders as a plain, non-clickable logo instead
  // of a link that would otherwise fall back to the current page.
  if (!website) {
    return <div className={className}>{logo}</div>;
  }

  return (
    <a target="_blank" href={website} className={className} rel="noreferrer">
      {logo}
    </a>
  );
};

export default Sponsor;
