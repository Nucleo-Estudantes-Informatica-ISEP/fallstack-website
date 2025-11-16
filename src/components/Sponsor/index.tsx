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
      className="mx-2 flex w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:size-48 items-center justify-center transition duration-300 ease-in-out hover:scale-105"
      rel="noreferrer"
    >
      <Image
        className="mx-auto h-auto max-h-[85%] max-w-[85%] sm:max-h-[90%] sm:max-w-[90%] rounded-[5px] object-contain"
        src={logoHref}
        alt={name}
      />
    </a>
  );
};

export default Sponsor;
