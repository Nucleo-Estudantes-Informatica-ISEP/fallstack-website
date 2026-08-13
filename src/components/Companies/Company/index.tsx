"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

import { companyProfileHref } from "@/domain/company/services/rank-access";

export interface CompanyProps {
  logoHref: string;
  name: string;
  websiteUrl?: string;
  hasContent: boolean;
  rankStyle: { hasInternalPage: boolean } | null;
  className?: string;
  divClassName?: string;
  logoWidth?: number;
  logoHeight?: number;
}

const Company: React.FC<CompanyProps> = ({
  logoHref,
  name,
  websiteUrl,
  hasContent,
  rankStyle,
  className,
  divClassName,
  logoWidth = 200,
  logoHeight = 100,
}) => {
  const companyHref = companyProfileHref(
    rankStyle?.hasInternalPage ?? false,
    name,
    websiteUrl,
    hasContent
  );

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
          width={logoWidth}
          height={logoHeight}
        />
      </Link>
    </div>
  );
};

export default Company;
