import type { Metadata } from "next";
import React from "react";
import Link from "next/link";

import { branding } from "@/edition/branding";
import { createPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Sobre o Fallstack | NEI-ISEP",
  description:
    "Conhece a equipa organizadora do Fallstack 2026, o Núcleo de Estudantes de Informática do ISEP (NEI-ISEP), contactos de suporte e repositório oficial.",
  path: "/about",
});

const linkClass =
  "ui-focus break-words text-primary underline underline-offset-4";

const About: React.FC = () => {
  return (
    <section className="artwork-clean artwork-readable flex min-h-screen w-full items-center justify-center px-4 py-20">
      <div className="ui-panel flex w-full max-w-3xl flex-col gap-10 rounded-lg p-6 sm:p-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl">Made By</h1>
          <p className="text-lg">
            <Link href="https://www.nei-isep.org" className={linkClass}>
              NEI-ISEP
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl">Git Repository</h2>
          <p className="text-lg">
            <Link href={branding.repositoryUrl} className={linkClass}>
              {branding.repositoryUrl}
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl">
            Precisas de ajuda? Contacta-nos!
          </h2>
          <p className="text-lg">
            Envia-nos um email para{" "}
            <Link href="mailto:support@nei-isep.org" className={linkClass}>
              support@nei-isep.org
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
