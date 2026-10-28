import type { ReactNode } from "react";

import HeadingText from "@/components/ui/HeadingText";
import InfoText from "@/components/InfoText";
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
      <section
        ref={contentRef}
        className="w-full bg-[url('/assets/optimized/bgDates.c7375bcdd8ed.webp')] bg-cover bg-center bg-no-repeat pt-14 pb-12"
      >
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
        className="flex flex-col items-center bg-background pb-20"
      >
        {sections.schedule}
      </section>

      <section className="flex w-full flex-col items-center bg-[url('/assets/optimized/bgInterview.af72997ee427.webp')] bg-cover bg-center bg-no-repeat pb-12 text-center">
        <HeadingText className="font-normal!" text="Speed Interviews" />
        <p className="w-full max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
          Este ano podes experienciar a modalidade de speed interviews com
          algumas das empresas presentes.
        </p>
      </section>

      {/* <section className="w-full bg-background !px-0">
        <PassSection />
      </section>*/}

      <section className="w-full bg-background px-0!">
        {sections.companies}
      </section>

      {sections.sponsors}

      {sections.faqs}
    </>
  );
};

export default Content;
