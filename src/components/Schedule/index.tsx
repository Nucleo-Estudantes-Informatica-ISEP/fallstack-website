"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

import HeadingText from "@/components/ui/HeadingText";
import { Language } from "@/domain/i18n/translations";

export interface ScheduleDay {
  hour: string;
  activity: string;
}

interface Props {
  language?: Language;
  firstDayTitle: string;
  secondDayTitle: string;
  scheduleEvents: ScheduleDay[][];
}

const Schedule: React.FC<Props> = ({
  firstDayTitle,
  secondDayTitle,
  scheduleEvents,
  language = Language.PT,
}) => {
  const [activeScheduleEventIndex, setActiveScheduleEventIndex] =
    useState<number>(0);

  return (
    <motion.div
      whileInView={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="container flex flex-col items-center justify-center"
    >
      <div className="flex w-full flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <HeadingText
          className="text-ui-muted lg:text-4xl!"
          text={
            language === Language.EN ? "Event programme" : "Programa do evento"
          }
        />
        <a
          href="https://calendar.google.com/calendar/u/2?cid=YTE5ZTE2MDcwY2I0ZWZiZDEyNWE4NjdiODQ3Njk4Mjc2NTlmM2Q3Y2Y2MmZjMjYyZWFlZDBlZGQ3OGJjMTgzN0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t"
          className="mb-4 text-base text-ui-muted underline md:mb-0 md:text-lg"
        >
          {language === Language.EN
            ? "Add to my calendar"
            : "Adicionar ao meu calendário"}
        </a>
      </div>
      <div className="container flex w-full flex-col items-center justify-center">
        <div className="relative flex w-full flex-col justify-center overflow-hidden rounded-3xl border border-secondary md:flex-row">
          <button
            className={`min-h-11 w-full px-4 py-2.5 hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              activeScheduleEventIndex === 0
                ? "bg-white text-black opacity-70"
                : "bg-transparent text-white"
            }`}
            onClick={() => setActiveScheduleEventIndex(0)}
            aria-pressed={activeScheduleEventIndex === 0}
          >
            <span className="z-20 text-xl font-semibold">{firstDayTitle}</span>
          </button>
          <button
            className={`min-h-11 w-full px-4 py-2.5 transition-all duration-300 hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              activeScheduleEventIndex === 1
                ? "bg-white text-black opacity-70"
                : "bg-transparent text-white"
            }`}
            onClick={() => setActiveScheduleEventIndex(1)}
            aria-pressed={activeScheduleEventIndex === 1}
          >
            <span className="z-20 text-xl font-semibold">{secondDayTitle}</span>
          </button>
        </div>
        <table className="mt-3 w-full table-fixed border-separate border-spacing-y-3 text-sm font-semibold sm:text-base md:text-lg">
          <motion.tbody
            initial={{
              opacity: 0,
              x: activeScheduleEventIndex === 0 ? -50 : 50,
            }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.2 }}
            key={activeScheduleEventIndex}
            className="w-full"
          >
            {scheduleEvents[activeScheduleEventIndex].map((entry, index) => (
              <motion.tr
                key={entry.hour}
                initial={{
                  opacity: 0,
                  x: activeScheduleEventIndex === 0 ? -50 : 50,
                }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.1 * index }}
                className="w-full"
              >
                <td className="w-1/4 rounded-l-full border border-r-0 border-secondary px-2 py-3 text-center align-middle text-base font-semibold wrap-anywhere sm:px-4 sm:text-lg">
                  {entry.hour}
                </td>
                <td className="w-3/4 rounded-r-full border border-l-0 border-secondary px-2 py-3 text-center align-middle text-sm font-normal wrap-anywhere sm:px-4 sm:text-left sm:text-base">
                  {entry.activity}
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default Schedule;
