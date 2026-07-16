"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import swal from "sweetalert";

import type { Stats } from "@/types/Stats";
import { httpClient } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import HistorySection from "@/components/HistorySection";
import PrimaryButton from "@/components/PrimaryButton";
import InterestSelector from "@/components/Profile/InterestSelector";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import type { InterestDto } from "@/application/dto/interestDto";

interface StatsProps {
  stats: Stats;
  students: number;
  history: SavedStudentDto[];
  interests: string[];
  availableInterests: InterestDto[];
}

const CompanyStatsSection: React.FC<StatsProps> = ({
  stats,
  students,
  history,
  interests,
  availableInterests,
}) => {
  const { totalScans, totalSaves } = stats;
  const studentsLeft = students - totalScans;
  const [companyInterests, setInterests] = useState<string[]>(interests);
  const router = useRouter();
  const { mutate, isPending } = useMutation(
    "Ocorreu um erro ao atualizar o teu perfil..."
  );

  const handleSave = () =>
    mutate(async () => {
      await httpClient.patch("/user", { interests: companyInterests });
      swal("Perfil atualizado com sucesso!");
      router.refresh();
    });

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
          <p className="mt-4 text-4xl font-bold">{studentsLeft}</p>
          <h2 className="text-center leading-6 font-medium text-white/35 md:text-xl">
            Alunos restantes
          </h2>
        </div>
      </div>
      <h1 className="mx-auto my-6 w-1/2 text-center text-2xl font-extrabold uppercase md:my-2 md:mb-4">
        Interesses
      </h1>
      <InterestSelector
        availableInterests={availableInterests}
        userInterests={companyInterests}
        setUserInterests={setInterests}
      />
      <PrimaryButton
        onClick={handleSave}
        loading={isPending}
        className="mt-4 px-12 py-2 text-lg"
      >
        Guardar
      </PrimaryButton>
      <HistorySection historyData={history} isCompany />
    </section>
  );
};

export default CompanyStatsSection;
