"use client";

import Image from "next/image";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";

import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
} from "@/components/ui/Icons";
import CompanyInfo from "@/components/Companies/CompanyInfo";
import type { CompanyDisplayDto } from "@/application/dto/companyDto";

interface CompanyPageSectionProps {
  company: CompanyDisplayDto;
}

const CompanyPageSection: React.FC<CompanyPageSectionProps> = ({ company }) => {
  const profile = company.profile;
  if (!profile) return null;

  const social = profile.socialLinks;

  return (
    <div className="mt-12 size-full items-center justify-center bg-black md:my-14">
      <div className="mt-4 mb-12 flex size-full flex-col items-center">
        <div className="flex flex-col items-center justify-center pt-8">
          {company.avatar ? (
            <div className="relative my-8 flex size-full flex-col items-center">
              <Image
                width={320}
                height={320}
                src={company.avatar}
                alt="profile image"
                className="w-full max-w-64"
              />
            </div>
          ) : (
            <Skeleton circle={true} height={120} width={120} />
          )}
          <div className="flex flex-col gap-y-2 px-4 text-center">
            <p className="text-3xl font-bold text-white md:text-5xl">
              <span>{company.name}</span>
            </p>
          </div>
          <p className="flex gap-x-4 pt-6">
            {social.twitter && (
              <Link
                href={social.twitter}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="size-6 text-white hover:scale-105 md:size-8" />
              </Link>
            )}
            {social.linkedin && (
              <Link
                href={social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="size-6 text-white transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
              </Link>
            )}
            {social.facebook && (
              <Link
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="size-6 text-white transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
              </Link>
            )}
            {social.instagram && (
              <Link
                href={social.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="size-6 text-white transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
              </Link>
            )}
            {company.website && (
              <Link
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="size-6 text-white transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
              </Link>
            )}
          </p>
        </div>
      </div>
      <CompanyInfo
        bodyText={profile.bodyText}
        videoHref={profile.videoHref ?? undefined}
        videoTitle={profile.videoTitle ?? undefined}
        showsPromoVideo={company.rank.style?.showsPromoVideo ?? false}
        facts={profile.facts}
        interests={company.interests}
      />
    </div>
  );
};

export default CompanyPageSection;
