import { FunctionComponent } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import {
  RiFacebookCircleFill,
  RiInstagramLine,
  RiLinkedinBoxFill,
  RiTwitterXFill,
} from "react-icons/ri";

import InstallButton from "../InstallButton";
import { FaLink } from "react-icons/fa6";

interface FooterProps {
  neiLogoSrc: StaticImageData;
}

const Footer: FunctionComponent<FooterProps> = ({ neiLogoSrc }) => {
  const currentYear = new Date().getFullYear();
  const NEI_WEBSITE_URL = "https://nei-isep.org";

  return (
    <footer className="bg-background flex w-full flex-col items-center gap-10 px-6 pt-12 text-center">
      <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-around">
        <div className="max-h-[200px] max-w-[220px] transition-all duration-300 hover:scale-105 sm:max-w-[275px] lg:max-w-[320px]">
          <a href={NEI_WEBSITE_URL} target="_blank" rel="noreferrer">
            <Image
              className="mx-auto block h-auto max-w-full drop-shadow-xl transition-all duration-300 hover:drop-shadow-2xl"
              src={neiLogoSrc}
              alt="Logo branco do Núcleo de Estudantes de Informática do ISEP (NEI)"
            />
          </a>
        </div>
        <div className="flex w-full flex-col items-center gap-6 md:flex-row md:justify-center lg:w-auto lg:items-center">
          <div className="flex gap-5">
            <Link
              className="text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              href="https://www.linkedin.com/company/nei-isep"
              target="_blank"
              rel="noreferrer"
              title="LinkedIn"
            >
              <RiLinkedinBoxFill color="text" size={48} />
            </Link>
            <Link
              className="text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              href="https://www.facebook.com/nei.isep"
              target="_blank"
              rel="noreferrer"
              title="Facebook"
            >
              <RiFacebookCircleFill color="text" size={45} />
            </Link>
            <Link
              className="text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              href="https://www.instagram.com/nei_isep"
              target="_blank"
              rel="noreferrer"
              title="Instagram"
            >
              <RiInstagramLine color="accent" size={45} />
            </Link>
            <Link
              className="text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              href="https://twitter.com/nei_isep"
              target="_blank"
              rel="noreferrer"
              title="Twitter"
            >
              <RiTwitterXFill color="text" size={45} />
            </Link>
            <Link
              href="https://linktr.ee/nei_isep"
              target="_blank"
              rel="noreferrer"
              className="h-max text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              title="Linktree do NEI"
            >
              <FaLink size={45} />
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <InstallButton />
          </div>
        </div>
      </div>
      <div className="flex w-full justify-center pb-6">
        <p className="select-none text-sm font-normal! text-secondary sm:text-base">
          Copyright &copy; {currentYear}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
export default Footer;
