"use client";

import React from "react";

import CompanyDescription from "@/components/Companies/CompanyDescription";
import FactSection from "@/components/Companies/FactSection";
import { Fact } from "@/domain/company/companyProfileContent";
import { companyVideoId } from "@/domain/company/companyVideo";
import { normalizeYouTubeEmbedUrl } from "@/domain/company/youtubeEmbed";

interface CompanyInfoProps {
  bodyText: string;
  videoHref: string | undefined;
  videoTitle: string | undefined;
  showsPromoVideo: boolean;
  interests?: string[];
  facts?: Fact[];
}

const CompanyInfo: React.FC<CompanyInfoProps> = ({
  bodyText,
  videoHref,
  videoTitle,
  interests,
  facts,
  showsPromoVideo,
}) => {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="w-full min-w-0 bg-background wrap-anywhere">
      {paragraphs.length > 0 && (
        <CompanyDescription>
          <h2 className="mb-4 text-left font-title text-3xl text-white sm:text-4xl">
            Sobre
          </h2>
          <div className="space-y-4 text-left text-base leading-relaxed text-white md:text-lg">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </CompanyDescription>
      )}
      {facts && facts.length > 0 && <FactSection facts={facts} />}
      {showsPromoVideo &&
        (() => {
          const embedUrl = normalizeYouTubeEmbedUrl(videoHref);
          const uploadedVideo = companyVideoId(videoHref);
          if (!embedUrl && !uploadedVideo) return null;
          return (
            <div className="mt-10 flex flex-col space-y-2 leading-8 lg:text-lg">
              <h2 className="mb-4 w-full text-left font-title text-3xl text-white sm:text-4xl">
                {videoTitle || "Vídeo"}
              </h2>
              <div className="flex w-full items-center justify-center">
                {uploadedVideo ? (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={videoHref}
                    aria-label={videoTitle || "Vídeo promocional"}
                    className="my-2.5 aspect-video w-full max-w-full rounded-lg"
                  >
                    O teu navegador não suporta vídeo MP4.
                  </video>
                ) : (
                  <iframe
                    className="my-2.5 aspect-video w-full max-w-full rounded-lg"
                    src={embedUrl ?? undefined}
                    title={videoTitle || "Vídeo promocional"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            </div>
          );
        })()}
      <div>
        <h2 className="mt-8 mb-4 text-left font-title text-3xl text-white sm:text-4xl">
          Interesses
        </h2>
        {interests !== undefined && interests.length > 0 ? (
          <div className="flex w-full flex-wrap gap-4">
            {interests.map((interest) => (
              <div
                key={interest}
                className="relative rounded-full border border-secondary px-5 py-3 text-sm text-white"
              >
                {interest}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex w-full flex-wrap gap-4">
            <div className="relative py-1 text-white">
              Sem interesses definidos...
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CompanyInfo;
