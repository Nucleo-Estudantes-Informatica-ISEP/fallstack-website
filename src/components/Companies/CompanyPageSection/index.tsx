"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";

import FactData from "@/types/FactData";
import { CompanyProps } from "@/components/Companies/Company";
import CompanyInfo from "@/components/Companies/CompanyInfo";
import { Facebook, Globe, Instagram, Linkedin, Twitter } from "@/styles/Icons";

interface CompanyPageSectionProps {
  company: {
    props: CompanyProps;
    tier: string;
  };
  modalInformation: {
    title: string;
    bodyText: ReactNode;
    videoHref?: string;
    videoTitle?: string;
    twitterLink?: string;
    facebookLink?: string;
    instagramLink?: string;
    youtubeLink?: string;
    linkedinLink?: string;
    website?: string;
    facts?: FactData[];
  };
  interests: string[];
}

const CompanyPageSection: React.FC<CompanyPageSectionProps> = ({
  company,
  modalInformation,
  interests,
}) => {
  return (
    <div className="mt-12 size-full items-center justify-center md:my-14">
      <div className="mb-12 mt-4 flex size-full flex-col items-center">
        <div className="flex flex-col items-center justify-center pt-8">
          {company.props.logoHref ? (
            <div className="relative my-8 flex size-full flex-col items-center">
              <Image
                width={320}
                height={320}
                src={company.props.logoHref}
                alt="profile image"
                className="aspect-auto w-full"
              />
            </div>
          ) : (
            <Skeleton circle={true} height={120} width={120} />
          )}
          <div className="flex flex-col gap-y-2 px-4 text-center">
            <p className="text-3xl font-bold md:text-5xl">
              <span>{company.props.modalInformation?.title}</span>
            </p>
          </div>
          <p className="flex gap-x-4 pt-6">
            {modalInformation.twitterLink && (
              <Link
                href={modalInformation.twitterLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="size-6 hover:scale-105 md:size-8" />
              </Link>
            )}
            {modalInformation.linkedinLink && (
              <Link
                href={modalInformation.linkedinLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="size-6 transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
              </Link>
            )}
            {modalInformation.facebookLink && (
              <Link
                href={modalInformation.facebookLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="size-6 transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
              </Link>
            )}
            {modalInformation.instagramLink && (
              <Link
                href={modalInformation.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="size-6 transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
              </Link>
            )}
            {modalInformation.website && (
              <Link
                href={modalInformation.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="size-6 transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
              </Link>
            )}
          </p>
        </div>
      </div>
      <CompanyInfo
        bodyText={modalInformation.bodyText}
        videoHref={modalInformation.videoHref}
        videoTitle={modalInformation.videoTitle}
        tier={company.tier}
        facts={modalInformation.facts}
        interests={interests}
      />
    </div>
  );
};

export default CompanyPageSection;
