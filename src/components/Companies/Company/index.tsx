"use client";

import React from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";

import { ModalInformation } from "@/types/ModalProps";
import { CompanyTier, COMPANY_TIER } from "@/domain/Company/company-tier";

export interface CompanyProps {
  logoHref: StaticImageData;
  name: string;
  websiteUrl?: string;
  modalInformation?: ModalInformation;
  tier?: CompanyTier;
  className?: string;
  interests?: string[];
  divClassName?: string;
}

import { hrefByCompanyTier } from "@/domain/Company/services/company-tier-access";

const Company: React.FC<CompanyProps> = ({
  logoHref,
  name,
  websiteUrl,
  tier = COMPANY_TIER.BRONZE,
  className,
  divClassName,
}) => {
  const companyHref = hrefByCompanyTier(tier, name, websiteUrl);

  return (
    <div
      className={`${divClassName} my-3 flex w-full items-center justify-center transition duration-300 ease-in-out hover:scale-105 sm:my-0 sm:max-w-52 lg:max-w-52`}
    >
      <Link
        rel="noreferrer"
        href={companyHref}
        target={companyHref.startsWith("/") ? "_self" : "_blank"}
        className="flex items-center justify-center"
      >
        <Image
          className={`${className} object-cover`}
          src={logoHref}
          alt={name}
        />
      </Link>
    </div>
  );
};

export default Company;
