"use client";

import type { Stats } from "@/types/Stats";
import HistorySection from "@/components/HistorySection";
import StatCounters from "@/components/StatCounters";
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
    <section className="flex w-full flex-col">
      <h2 className="text-2xl font-semibold text-white">
        Sumário do teu perfil
      </h2>
      <StatCounters
        items={[
          { value: totalScans, label: totalScans === 1 ? "Scan" : "Scans" },
          {
            value: totalSaves,
            label:
              totalSaves === 1 ? "Gravação de Perfil" : "Gravações de Perfil",
          },
          { value: companiesLeft, label: "Empresas restantes" },
        ]}
      />
      <HistorySection historyData={historyData} />
    </section>
  );
};

export default StatsSection;
