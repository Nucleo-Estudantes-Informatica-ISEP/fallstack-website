"use client";

import Image from "next/image";
import Link from "next/link";

import { useUiText } from "@/contexts/UiLanguageContext";
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "@/components/ui/Icons";
import CompanyInfo from "@/components/Companies/CompanyInfo";
import Footer from "@/components/Footer";
import neiLogo from "@/../public/assets/images/logo-white.png";
import type { CompanyDisplayDto } from "@/application/dto/companyDto";

interface CompanyPageSectionProps {
  company: CompanyDisplayDto;
}

const CompanyPageSection: React.FC<CompanyPageSectionProps> = ({ company }) => {
  const t = useUiText();

  const profile = company.profile;
  if (!profile) return null;

  const social = profile.socialLinks;

  return (
    <>
      <div className="my-6 w-[calc(100%-2rem)] max-w-7xl border border-secondary bg-background px-5 py-8 text-white sm:my-12 sm:px-12 lg:px-28 lg:py-12">
        <Link
          href="/"
          className="ui-focus text-sm text-white/70 hover:text-white"
        >
          {t("← Voltar")}
        </Link>
        <div className="mt-4 mb-12 flex size-full flex-col items-center">
          <div className="flex flex-col items-center justify-center pt-8">
            {company.avatar ? (
              <div className="relative my-8 flex size-44 items-center justify-center overflow-hidden rounded-full border-8 border-white p-5 sm:size-64">
                <Image
                  unoptimized={company.avatar.startsWith("/api/media/logo/")}
                  width={320}
                  height={320}
                  src={company.avatar}
                  alt={t("Logótipo de {value}", { value: company.name })}
                  className="size-full object-contain"
                />
              </div>
            ) : (
              <div className="my-8 flex size-44 items-center justify-center rounded-full border-8 border-white p-5 text-center font-title text-3xl sm:size-64">
                {company.name}
              </div>
            )}
            <div className="flex flex-col gap-y-2 px-4 text-center">
              <h1 className="sr-only">
                <span>{company.name}</span>
              </h1>
            </div>
            <p className="flex flex-wrap justify-center gap-5 pt-6">
              {social.twitter && (
                <Link
                  href={social.twitter}
                  aria-label="X / Twitter"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="size-6 text-white hover:scale-105 md:size-8" />
                </Link>
              )}
              {social.linkedin && (
                <Link
                  href={social.linkedin}
                  aria-label="LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="size-6 text-white transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
                </Link>
              )}
              {social.facebook && (
                <Link
                  href={social.facebook}
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="size-6 text-white transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
                </Link>
              )}
              {social.instagram && (
                <Link
                  href={social.instagram}
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="size-6 text-white transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
                </Link>
              )}
              {social.youtube && (
                <Link
                  href={social.youtube}
                  aria-label="YouTube"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Youtube className="size-6 text-white md:size-8" />
                </Link>
              )}
              {company.website && (
                <Link
                  href={company.website}
                  aria-label="Website"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="size-6 text-white transition-all hover:scale-105 hover:drop-shadow-2xl md:size-8" />
                </Link>
              )}
            </p>
          </div>
        </div>
        <div>
          <CompanyInfo
            bodyText={profile.bodyText}
            videoHref={profile.videoHref ?? undefined}
            videoTitle={profile.videoTitle ?? undefined}
            showsPromoVideo={company.rank.style?.showsPromoVideo ?? false}
            facts={profile.facts}
            interests={company.interests}
          />
          {company.website && (
            <section className="mt-10">
              <h2 className="mb-4 font-title text-3xl sm:text-4xl">
                {t("Contacto")}
              </h2>
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="ui-focus inline-block max-w-full rounded-full border border-secondary px-5 py-3 text-sm wrap-anywhere"
              >
                {company.website}
              </a>
            </section>
          )}
        </div>
      </div>
      <Footer neiLogoSrc={neiLogo} />
    </>
  );
};

export default CompanyPageSection;
