"use client";

import type { Stats } from "@/types/Stats";
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
  const { totalScans, totalSaves } = stats;

  const items = [
    { value: totalScans, label: totalScans === 1 ? "Scan" : "Scans" },
    {
      value: totalSaves,
      label: totalSaves === 1 ? "Gravação de Perfil" : "Gravações de Perfil",
    },
    {
      value: companiesLeft,
      label: companiesLeft === 1 ? "Empresa restante" : "Empresas restantes",
    },
  ];

  return (
    <section className="flex w-full flex-col">
      <h2 className="mb-5 text-center font-sans text-2xl text-white lg:text-left lg:text-[1.75rem]">
        Sumário do teu perfil
      </h2>
      <div className="mx-auto grid w-full max-w-60 grid-cols-1 divide-y divide-ui-border md:my-4 md:max-w-none md:grid-cols-3 md:divide-x md:divide-y-0">
        {items.map(({ value, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-y-2 py-4 md:gap-y-3 md:px-2 md:py-1"
          >
            <p className="text-4xl leading-none font-bold text-white">
              {value}
            </p>
            <p className="text-center text-lg leading-6 text-ui-muted md:text-xl">
              {label}
            </p>
          </div>
        ))}
      </div>
      <HistorySection historyData={historyData} />
    </section>
  );
};

export default StatsSection;
