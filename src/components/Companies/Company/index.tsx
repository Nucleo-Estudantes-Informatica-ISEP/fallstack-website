"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

import { companyProfileHref } from "@/domain/company/services/rank-access";

export interface CompanyProps {
  logoHref?: string;
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
}) => {
  const companyHref = companyProfileHref(
    rankStyle?.hasInternalPage ?? false,
    name,
    websiteUrl,
    hasContent
  );

  return (
    <div
      className={`flex h-24 w-[calc(50%-0.5rem)] items-center justify-center md:h-28 md:w-[calc(25%-1rem)]`}
    >
      <Link
        rel="noreferrer"
        href={companyHref}
        target={companyHref.startsWith("/") ? "_self" : "_blank"}
        className="relative flex size-full max-w-40 items-center justify-center"
      >
        {logoHref ? (
          <Image
            className="object-contain"
            src={logoHref}
            alt={name}
            fill
            sizes="160px"
          />
        ) : (
          <span className="text-lg font-semibold">{name}</span>
        )}
      </Link>
    </div>
  );
};

export default Company;
