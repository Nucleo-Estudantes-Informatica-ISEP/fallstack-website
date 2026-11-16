import type { ReactNode } from "react";

import HeadingText from "@/components/ui/HeadingText";
import InfoText from "@/components/InfoText";
import PassSection from "@/components/PassSection";
import type { HomepageDto } from "@/application/dto/homepageDto";
import { edition } from "@/edition";

export type HomepageSections = Record<keyof HomepageDto, ReactNode>;

interface ContentProps {
  contentRef: React.RefObject<HTMLDivElement>;
  sections: HomepageSections;
}

const Content: React.FC<ContentProps> = ({ contentRef, sections }) => {
  const { branding } = edition;

  return (
    <>
      <section className="artwork-clean artwork-readable w-full bg-cover bg-center bg-no-repeat py-12">
        <InfoText
          days={branding.event.days}
          month={branding.event.month}
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
            text="Jantar Empresarial"
          />
          <p className="w-full max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
            O Jantar Empresarial está confirmado para o FallStack 2026.
          </p>
          <p className="mt-2 w-full max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
            Mais informações em breve.
          </p>
        </section>
        <section className="flex w-full flex-col items-center">
          <HeadingText
            className="font-normal! lg:text-4xl!"
            text="Speed Interviews"
          />
          <p className="w-full max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
            As Speed Interviews estão de volta, proporcionando um ponto de
            contacto direto entre empresas e estudantes finalistas.
          </p>
        </section>
      </div>

      <section className="w-full bg-background px-0!">
        <PassSection />
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
