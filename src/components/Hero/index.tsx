"use client";

import { FunctionComponent } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import useSession from "@/hooks/useSession";
import PrimaryLinkButton from "@/components/ui/PrimaryLinkButton";
import { branding } from "@/edition/branding";

interface HeaderProps {
  contentRef: React.RefObject<HTMLDivElement>;
}

const Hero: FunctionComponent<HeaderProps> = ({ contentRef }) => {
  const { user } = useSession();

  return (
    <>
      <section
        ref={contentRef}
        className="artwork-clean artwork-readable relative flex size-full min-h-screen flex-col items-center justify-center bg-cover bg-center bg-no-repeat text-center"
      >
        <h1 className="sr-only">
          {branding.name} {branding.year}
        </h1>
        <Image
          src="/favicon.ico"
          width={256}
          height={296}
          alt={`${branding.name} ${branding.year}`}
          className="mt-20 h-auto w-1/2 max-w-56 object-contain"
        />
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
          className="flex w-full flex-col items-center justify-center pb-20 md:px-14"
        >
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
            {!user && (
              <PrimaryLinkButton loading={false} href="/signup">
                Quero registar-me no evento
              </PrimaryLinkButton>
            )}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator - Positioned at bottom of hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{
              y: [0, 10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="flex flex-col items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-6 text-white opacity-70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
            <span className="text-sm text-white opacity-70">Scroll</span>
          </motion.div>
        </motion.div>
      </section>

      <div className="flex w-full flex-col items-center justify-center gap-6 bg-background py-16 text-center">
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
