import EditionIntroduction from "@/components/EditionIntroduction";
import { offseasonContent } from "@/edition/offseason";

interface OffseasonLandingProps {
  language: "PT" | "EN";
}

export default function OffseasonLanding({ language }: OffseasonLandingProps) {
  const text = offseasonContent[language];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-2xl">
        <p className="mb-4 text-sm font-semibold tracking-[0.3em] text-gray-400 uppercase">
          Fallstack 2026
        </p>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl">
          {text.title}
        </h1>

        <p className="mb-4 text-lg leading-relaxed text-gray-300">
          {text.description}
        </p>

        <EditionIntroduction
          language={language}
          className="mb-8 text-base text-gray-400"
        />

        <p className="font-semibold text-white">{text.contact}</p>
      </div>
    </main>
  );
}
