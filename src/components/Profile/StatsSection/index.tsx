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

  return (
    <section className="flex w-full flex-col items-center justify-center rounded-t-3xl p-4 md:rounded-md md:p-8">
      <h1 className="mx-auto my-6 w-1/2 text-center text-2xl font-extrabold uppercase md:my-2">
        Visão Geral
      </h1>
      <div className="mb-6 grid w-full grid-cols-1 items-center justify-center gap-y-4 md:my-6 md:grid-cols-3">
        <div className="flex flex-col items-center gap-y-2 md:gap-y-4">
          <p className="mt-4 text-4xl font-bold">{totalScans}</p>
          <h2 className="text-center leading-6 font-medium text-white/35 md:text-xl">
            {totalScans === 1 ? "Scan" : "Scans"}
          </h2>
        </div>
        <div className="flex flex-col items-center gap-y-2 md:gap-y-4 md:border-x-4">
          <p className="mt-4 text-4xl font-bold">{totalSaves}</p>
          <h2 className="text-center leading-6 font-medium text-white/35 md:text-xl">
            {totalSaves === 1 ? "Gravação de Perfil" : "Gravações de Perfil"}
          </h2>
        </div>
        <div className="flex flex-col items-center gap-y-2 md:gap-y-4">
          <p className="mt-4 text-4xl font-bold">{companiesLeft}</p>
          <h2 className="text-center leading-6 font-medium text-white/35 md:text-xl">
            Empresas restantes
          </h2>
        </div>
      </div>
      <HistorySection historyData={historyData} />
    </section>
  );
};

export default StatsSection;
