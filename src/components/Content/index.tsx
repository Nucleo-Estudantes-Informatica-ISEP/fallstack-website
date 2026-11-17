import type { ReactNode } from "react";

import HeadingText from "@/components/ui/HeadingText";
import InfoText from "@/components/InfoText";
import PassSection from "@/components/PassSection";
import type { HomepageDto } from "@/application/dto/homepageDto";
import { Language } from "@/domain/i18n/translations";
import { edition } from "@/edition";

export type HomepageSections = Record<keyof HomepageDto, ReactNode>;

interface ContentProps {
  contentRef: React.RefObject<HTMLDivElement>;
  sections: HomepageSections;
  language?: Language;
}

const Content: React.FC<ContentProps> = ({
  contentRef,
  sections,
  language = Language.PT,
}) => {
  const isEnglish = language === Language.EN;
  const { branding } = edition;

  return (
    <>
      <section className="artwork-clean artwork-readable w-full bg-cover bg-center bg-no-repeat py-12">
        <InfoText
          days={branding.event.days}
          language={language}
          month={
            isEnglish
              ? new Intl.DateTimeFormat("en-GB", {
                  month: "long",
                  timeZone: "Europe/Lisbon",
                }).format(new Date(branding.event.startsAt))
              : branding.event.month
          }
          year={branding.year}
          beginningTime={branding.event.beginningTime}
          endTime={branding.event.endTime}
        />
      </section>
      <section
        ref={contentRef}
        className="flex flex-col items-center bg-background py-16"
      >
        {sections.schedule}
      </section>

      <div className="artwork-clean artwork-readable flex w-full flex-col items-center gap-16 bg-cover bg-center bg-no-repeat px-6 py-16 text-center">
        <section className="flex w-full flex-col items-center">
          <HeadingText
            className="font-normal! lg:text-4xl!"
            text={isEnglish ? "Business Dinner" : "Jantar Empresarial"}
          />
          <p className="w-full max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
            {isEnglish
              ? "The Business Dinner is confirmed for FallStack 2026."
              : "O Jantar Empresarial está confirmado para o FallStack 2026."}
          </p>
          <p className="mt-2 w-full max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
            {isEnglish
              ? "More information coming soon."
              : "Mais informações em breve."}
          </p>
        </section>
        <section className="flex w-full flex-col items-center">
          <HeadingText
            className="font-normal! lg:text-4xl!"
            text="Speed Interviews"
          />
          <p className="w-full max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
            {isEnglish
              ? "Speed Interviews are back, connecting companies directly with final-year students."
              : "As Speed Interviews estão de volta, proporcionando um ponto de contacto direto entre empresas e estudantes finalistas."}
          </p>
        </section>
      </div>

      <section className="w-full bg-background px-0!">
        <PassSection language={language} />
      </section>

      <section className="w-full bg-background px-0!">
        {sections.companies}
      </section>

      {sections.sponsors}

      {sections.faqs}
    </>
  );
};

export default Content;
