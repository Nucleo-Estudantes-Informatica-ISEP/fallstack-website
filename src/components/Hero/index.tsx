"use client";

import { FunctionComponent } from "react";
import Image, { StaticImageData } from "next/image";
import { motion } from "framer-motion";

import PrimaryLinkButton from "../PrimaryLinkButton";

interface HeaderProps {
  logoSrc: StaticImageData;
  logoAlt: string;
  contentRef: React.RefObject<HTMLDivElement>;
}

const Hero: FunctionComponent<HeaderProps> = ({
  logoSrc,
  logoAlt,
  contentRef,
}) => {
  return (
    <>
      <section
        ref={contentRef}
        className="relative flex size-full min-h-screen flex-col items-center justify-center bg-[url('/assets/images/bgHero.svg')] bg-cover bg-center bg-no-repeat text-center"
      >
        <motion.div
          initial={{
            opacity: 0,
            marginTop: 200,
          }}
          whileInView={{
            opacity: 1,
            marginTop: 0,
          }}
          viewport={{
            once: true,
          }}
          className="flex w-full flex-col items-center justify-center gap-28 pt-20 md:px-14"
        >
          <Image
            className="mt-12 max-h-[380px] w-1/2 object-contain drop-shadow-md md:mt-0 lg:max-h-[580px] lg:w-96"
            src={logoSrc}
            alt={logoAlt}
          />
          <motion.div
            initial={{
              opacity: 0,
              marginTop: 50,
            }}
            whileInView={{
              opacity: 1,
              marginTop: 0,
            }}
            viewport={{
              once: true,
            }}
            className="flex w-full flex-col items-center justify-center gap-10 pb-10 md:px-5"
          >
            <PrimaryLinkButton loading={false} href="/signup">
              Quero registar-me no evento
            </PrimaryLinkButton>
          </motion.div>
        </motion.div>
      </section>
      <div className="bg-background flex w-full flex-col items-center justify-center gap-6 py-16 text-center">
        <motion.p
          initial={{
            opacity: 0,
            marginLeft: -500,
          }}
          whileInView={{
            opacity: 1,
            marginLeft: 0,
          }}
          viewport={{
            once: true,
          }}
          className="text-2xl leading-tight text-balance text-white md:text-3xl lg:text-4xl"
        >
          O evento que reúne empresas do setor informático está de volta para a
          sua oitava edição no ISEP.
        </motion.p>
      </div>
    </>
  );
};

export default Hero;
