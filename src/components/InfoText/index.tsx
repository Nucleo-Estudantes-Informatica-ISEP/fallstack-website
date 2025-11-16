"use client";

import { motion } from "framer-motion";

import { QuestionCircle } from "@/styles/Icons";

import EventInfos from "../EventInfos/index";
import PrimaryLinkButton from "../PrimaryLinkButton";

interface InfoTextProps {
  days: number[];
  month: string;
  year: number;
  beginningTime: string;
  endTime: string;
}

const InfoText: React.FC<InfoTextProps> = ({
  days,
  month,
  year,
  beginningTime,
  endTime,
}) => {
  return (
    <motion.section
      initial={{
        opacity: 0,
        marginRight: -500,
      }}
      whileInView={{
        marginRight: 0,
        opacity: 1,
      }}
      viewport={{
        once: true,
      }}
      className="flex flex-col items-center gap-6 text-center text-base sm:text-lg md:px-8 lg:flex-row lg:items-center lg:justify-between lg:text-left lg:text-xl"
    >
      <EventInfos
        days={days}
        month={month}
        year={year}
        beginningTime={beginningTime}
        endTime={endTime}
      />

      <PrimaryLinkButton
        loading={false}
        href="/location"
        className="w-full max-w-xs justify-center gap-2 !px-4 !py-3 text-base font-semibold sm:text-lg lg:mt-0 lg:max-w-none lg:self-center"
      >
        <QuestionCircle /> Como chegar?
      </PrimaryLinkButton>
    </motion.section>
  );
};

export default InfoText;
