import { ScheduleDays } from "../../utils/ScheduleDays";
import CompaniesSection from "../Companies/CompaniesSection";
import FaqSection from "../Faq/FaqSection";
import HeadingText from "../HeadingText";
import InfoText from "../InfoText";
import PassSection from "../PassSection";
import Schedule from "../Schedule";
import SponsorsSection from "../SponsorsSection";

interface ContentProps {
  contentRef: React.RefObject<HTMLDivElement>;
}

const Content: React.FC<ContentProps> = ({ contentRef }) => {
  return (
    <>
      <section
        ref={contentRef}
        className="w-full bg-[url('/assets/images/bgDates.svg')] bg-cover bg-center bg-no-repeat pt-14 pb-12"
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
        className="bg-background flex flex-col items-center pb-20"
      >
        <Schedule
          firstDayTitle="25 de Novembro"
          secondDayTitle="26 de Novembro"
          scheduleEvents={ScheduleDays}
        />
      </section>

      <section className="flex w-full flex-col items-center bg-[url('/assets/images/bgInterview.svg')] bg-cover bg-center bg-no-repeat pb-12 text-center">
        <HeadingText className="!font-normal" text="Speed Interviews" />
        <p className="w-full max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
          Este ano podes experienciar a modalidade de speed interviews com
          algumas das empresas presentes.
        </p>
      </section>

      <section className="bg-background w-full !px-0">
        <PassSection />
      </section>

      <section className="bg-background w-full !px-0">
        <CompaniesSection />
      </section>

      <SponsorsSection />

      <FaqSection />
    </>
  );
};

export default Content;
