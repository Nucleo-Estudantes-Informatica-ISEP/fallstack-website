import { ScheduleDays } from "@/utils/ScheduleDays";
import CompaniesSection from "@/components/Companies/CompaniesSection";
import FaqSection from "@/components/Faq/FaqSection";
import HeadingText from "@/components/HeadingText";
import InfoText from "@/components/InfoText";
import PassSection from "@/components/PassSection";
import Schedule from "@/components/Schedule";
import SponsorsSection from "@/components/SponsorsSection";

interface ContentProps {
  contentRef: React.RefObject<HTMLDivElement>;
}

const Content: React.FC<ContentProps> = ({ contentRef }) => {
  return (
    <>
      <section
        ref={contentRef}
        className="w-full bg-[url('/assets/images/bgDates.svg')] bg-cover bg-center bg-no-repeat pb-12 pt-14"
      >
        <InfoText
          days={[25, 26]}
          month="novembro"
          year={2025}
          beginningTime="8:30h"
          endTime="17:30h"
        />
      </section>
      <section
        ref={contentRef}
        className="flex flex-col items-center bg-background pb-20"
      >
        <Schedule
          firstDayTitle="25 de Novembro"
          secondDayTitle="26 de Novembro"
          scheduleEvents={ScheduleDays}
        />
      </section>

      <section className="flex w-full flex-col items-center bg-[url('/assets/images/bgInterview.svg')] bg-cover bg-center bg-no-repeat pb-12 text-center">
        <HeadingText className="!font-normal" text="Speed Interviews" />
        <p className="w-full max-w-2xl text-balance text-lg leading-relaxed sm:text-xl">
          Este ano podes experienciar a modalidade de speed interviews com
          algumas das empresas presentes.
        </p>
      </section>

      <section className="w-full bg-background !px-0">
        <PassSection />
      </section>

      <section className="w-full bg-background !px-0">
        <CompaniesSection />
      </section>

      <SponsorsSection />

      <FaqSection />
    </>
  );
};

export default Content;
