"use client";

import { FunctionComponent } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { FaLink } from "react-icons/fa6";
import { MdOutlinePrivacyTip } from "react-icons/md";
import {
  RiFacebookCircleFill,
  RiInstagramLine,
  RiLinkedinBoxFill,
  RiTwitterXFill,
} from "react-icons/ri";

import InstallButton from "@/components/InstallButton";

interface FooterProps {
  neiLogoSrc: StaticImageData;
  landing?: boolean;
}

const Footer: FunctionComponent<FooterProps> = ({
  neiLogoSrc,
  landing = false,
}) => {
  const currentYear = new Date().getFullYear();
  const NEI_WEBSITE_URL = "https://nei-isep.org";

  return (
    <footer
      className={`flex w-full flex-col items-center gap-10 bg-background px-6 text-center ${landing ? "pt-24" : "pt-12"}`}
    >
      <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-around">
        <div className="max-h-24 max-w-40 transition-all duration-300 hover:scale-105 sm:max-w-44 lg:max-w-48">
          <a href={NEI_WEBSITE_URL} target="_blank" rel="noreferrer">
            <Image
              className="mx-auto block h-auto max-w-full drop-shadow-xl transition-all duration-300 hover:drop-shadow-2xl"
              src={neiLogoSrc}
              alt="Logo branco do Núcleo de Estudantes de Informática do ISEP (NEI)"
            />
          </a>
        </div>
        <div className="flex w-full flex-col items-center gap-6 md:flex-row md:justify-center lg:w-auto lg:items-center">
          <div className="flex gap-2">
            <Link
              className="flex min-h-11 min-w-11 items-center justify-center text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              href="https://www.linkedin.com/company/nei-isep"
              target="_blank"
              rel="noreferrer"
              title="LinkedIn"
            >
              <RiLinkedinBoxFill color="text" size={28} />
            </Link>
            <Link
              className="flex min-h-11 min-w-11 items-center justify-center text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              href="https://www.facebook.com/nei.isep"
              target="_blank"
              rel="noreferrer"
              title="Facebook"
            >
              <RiFacebookCircleFill color="text" size={28} />
            </Link>
            <Link
              className="flex min-h-11 min-w-11 items-center justify-center text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              href="https://www.instagram.com/nei_isep"
              target="_blank"
              rel="noreferrer"
              title="Instagram"
            >
              <RiInstagramLine color="accent" size={28} />
            </Link>
            <Link
              className="flex min-h-11 min-w-11 items-center justify-center text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              href="https://twitter.com/nei_isep"
              target="_blank"
              rel="noreferrer"
              title="Twitter"
            >
              <RiTwitterXFill color="text" size={28} />
            </Link>
            <Link
              href="https://linktr.ee/nei_isep"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 min-w-11 items-center justify-center text-xl drop-shadow-xl transition-all duration-300 hover:scale-110 hover:drop-shadow-2xl"
              title="Linktree do NEI"
            >
              <FaLink size={28} />
            </Link>
          </div>
          {!landing && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <InstallButton className="flex min-h-11 min-w-11 items-center justify-center text-xl drop-shadow-xl transition-all duration-300 hover:scale-110" />

              <Link
                href="/privacy-policy"
                title="Política de Privacidade"
                className="flex min-h-11 min-w-11 items-center justify-center text-xl drop-shadow-xl transition-all duration-300 hover:scale-110"
              >
                <MdOutlinePrivacyTip color="text" size={28} />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full justify-center pb-6">
        <p className="text-sm font-normal! text-secondary select-none sm:text-base">
          Copyright &copy; {currentYear}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
