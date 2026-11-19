"use client";

import { useUiText } from "@/contexts/UiLanguageContext";

interface BioSectionProps {
  bio?: string | null;
}

const BioSection: React.FC<BioSectionProps> = ({ bio }) => {
  const t = useUiText();

  return (
    <div className="my-4 flex flex-col space-y-2 px-12 text-black">
      <div className="flex">
        <h3 className="text-left text-xl font-bold text-gray-600">
          {t("Sobre")}
        </h3>
      </div>
      <p className="mx-auto mt-1 block w-full resize-none rounded-md bg-transparent text-justify text-base wrap-break-word whitespace-pre-wrap text-black focus-within:text-primary focus:border-primary focus:ring-primary">
        {bio?.toString()}
      </p>
    </div>
  );
};

export default BioSection;
