"use client";

import { FunctionComponent } from "react";
import Image, { StaticImageData } from "next/image";
import { motion } from "framer-motion";

interface ActivityProps {
  logo: StaticImageData;
  title: string;
  day: number;
  location?: string;
  children?: React.ReactNode;
  imageOrientation?: "left" | "right";
}

const Activity: FunctionComponent<ActivityProps> = ({
  logo,
  title,
  day,
  location = "Auditório Magno (Edifício A) do ISEP",
  children,
}) => {
  return (
    <motion.section
      initial={{
        opacity: 0,
        x: 40,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{
        once: true,
      }}
      className="items-left my-12 flex flex-col justify-center"
    >
      <div className="flex flex-col space-y-5">
        <h5 className="w-full text-center text-4xl font-bold md:text-left md:text-5xl lg:col-span-2">
          Dia {day} - {title}
        </h5>
        <p className="mt-5 text-2xl">{location}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 items-center md:grid-cols-2">
        <div className="mx-auto w-full text-center text-xl leading-7 md:text-justify md:leading-8 lg:text-2xl">
          {children}
        </div>

        <Image
          src={logo}
          alt={`Atividade ${title}`}
          className="mx-auto w-3/4 lg:w-4/5"
        />
      </div>
    </motion.section>
  );
};

export default Activity;
