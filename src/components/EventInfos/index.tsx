"use client";

import { FunctionComponent } from "react";

import { Calendar, Pin, Watch } from "@/components/ui/Icons";
import InfoBit from "@/components/InfoBit";
import { Language } from "@/domain/i18n/translations";
import { branding } from "@/edition/branding";

interface EventInfosProps {
  language?: Language;
  days: number[];
  month: string;
  year: number;
  beginningTime: string;
  endTime: string;
}

const EventInfos: FunctionComponent<EventInfosProps> = ({
  language = Language.PT,
  days,
  month,
  year,
  beginningTime,
  endTime,
}) => {
  return (
    <section className="flex flex-col items-center gap-2 text-base sm:text-lg lg:my-0 lg:items-start lg:px-16 lg:text-2xl">
      <InfoBit
        icon={<Calendar />}
        info={
          language === Language.EN
            ? `${days.join(" and ")} ${month} ${year}`
            : `${days.join(" e ")} de ${month} ${year}`
        }
      />
      <InfoBit icon={<Watch />} info={`${beginningTime}-${endTime}`} />
      <InfoBit
        icon={<Pin className="size-[30px]" />}
        info={branding.event.venue}
      />
    </section>
  );
};

export default EventInfos;
