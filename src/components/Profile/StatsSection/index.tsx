"use client";

import type { Stats } from "@/types/Stats";
import { useUiText } from "@/contexts/UiLanguageContext";
import HistorySection from "@/components/HistorySection";
import type { SavedStudentDto } from "@/application/dto/historyDto";

interface StatsProps {
  stats: Stats;
  companiesLeft: number;
  historyData: SavedStudentDto[];
}

const StatsSection: React.FC<StatsProps> = ({
  stats,
  companiesLeft,
  historyData,
}) => {
  const t = useUiText();

  const { totalScans, totalSaves } = stats;

  const items = [
    { value: totalScans, label: totalScans === 1 ? "Scan" : "Scans" },
    {
      value: totalSaves,
      label:
        totalSaves === 1 ? t("Gravação de Perfil") : t("Gravações de Perfil"),
    },
    {
      value: companiesLeft,
      label:
        companiesLeft === 1 ? t("Empresa restante") : t("Empresas restantes"),
    },
  ];

  return (
    <section className="flex w-full flex-col">
      <h2 className="mb-5 text-center font-sans text-2xl font-semibold text-white lg:text-left lg:text-[1.75rem]">
        {t("Sumário do teu perfil")}
      </h2>
      <div className="mx-auto grid w-full max-w-60 grid-cols-1 divide-y divide-ui-border md:my-4 md:max-w-none md:grid-cols-3 md:divide-x md:divide-y-0">
        {items.map(({ value, label }) => (
          <div
            key={t(label)}
            className="flex flex-col items-center gap-y-2 py-4 md:gap-y-3 md:px-2 md:py-1"
          >
            <p className="text-4xl leading-none font-bold text-white">
              {value}
            </p>
            <p className="text-center text-lg leading-6 text-ui-muted md:text-xl">
              {t(label)}
            </p>
          </div>
        ))}
      </div>
      <HistorySection historyData={historyData} />
    </section>
  );
};

export default StatsSection;
