"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import type { Stats } from "@/types/Stats";
import { httpClient } from "@/lib/http/client";
import { useMutation } from "@/hooks/useMutation";
import PrimaryButton from "@/components/ui/PrimaryButton";
import CompanySavedStudentsList from "@/components/Companies/CompanyProfile/CompanySavedStudentsList";
import InterestSelector from "@/components/Profile/InterestSelector";
import type { SavedStudentDto } from "@/application/dto/historyDto";
import type { InterestDto } from "@/application/dto/interestDto";

interface StatsProps {
  stats: Stats;
  students: number;
  history: SavedStudentDto[];
  interestIds: string[];
  availableInterests: InterestDto[];
}

// Same layout and styles as the student summary
// (src/components/Profile/StatsSection), kept as separate code.
const CompanyStatsSection: React.FC<StatsProps> = ({
  stats,
  students,
  history,
  interestIds,
  availableInterests,
}) => {
  const { totalScans, totalSaves } = stats;
  const studentsLeft = Math.max(students - totalScans, 0);
  const [companyInterestIds, setCompanyInterestIds] =
    useState<string[]>(interestIds);
  const router = useRouter();
  const { mutate, isPending } = useMutation();

  const handleSave = () =>
    mutate(async () => {
      try {
        await httpClient.patch("/user", { interests: companyInterestIds });
      } catch {
        // Server and network errors arrive in English; employees get one
        // Portuguese message, and the selection stays as they left it.
        toast.error("Não foi possível guardar os interesses. Tenta novamente.");
        return;
      }
      toast.success("Interesses guardados com sucesso!");
      router.refresh();
    });

  return (
    <section className="flex w-full flex-col items-center justify-center rounded-t-3xl p-4 md:rounded-md md:p-8">
      <h2 className="mx-auto my-6 w-1/2 text-center text-2xl font-extrabold uppercase md:my-2">
        Visão Geral
      </h2>
      <div className="mb-6 grid w-full grid-cols-1 items-center justify-center gap-y-4 md:my-6 md:grid-cols-3">
        <div className="flex flex-col items-center gap-y-2 md:gap-y-4">
          <p className="mt-4 text-4xl font-bold">{totalScans}</p>
          <p className="text-center font-title leading-6 font-medium text-white/70 md:text-xl">
            {totalScans === 1 ? "Scan" : "Scans"}
          </p>
        </div>
        <div className="flex flex-col items-center gap-y-2 md:gap-y-4 md:border-x-4">
          <p className="mt-4 text-4xl font-bold">{totalSaves}</p>
          <p className="text-center font-title leading-6 font-medium text-white/70 md:text-xl">
            {totalSaves === 1 ? "Gravação de Perfil" : "Gravações de Perfil"}
          </p>
        </div>
        <div className="flex flex-col items-center gap-y-2 md:gap-y-4">
          <p className="mt-4 text-4xl font-bold">{studentsLeft}</p>
          <p className="text-center font-title leading-6 font-medium text-white/70 md:text-xl">
            {studentsLeft === 1 ? "Aluno restante" : "Alunos restantes"}
          </p>
        </div>
      </div>
      <h2
        id="company-interests-heading"
        className="mx-auto my-6 w-1/2 text-center text-2xl font-extrabold uppercase md:my-2 md:mb-4"
      >
        Interesses
      </h2>
      <div
        role="group"
        aria-labelledby="company-interests-heading"
        className="w-full"
      >
        <InterestSelector
          availableInterests={availableInterests}
          selectedInterestIds={companyInterestIds}
          setSelectedInterestIds={setCompanyInterestIds}
        />
      </div>
      <PrimaryButton
        onClick={handleSave}
        loading={isPending}
        className="mt-4 px-12 py-2 text-lg"
      >
        Guardar
      </PrimaryButton>
      <CompanySavedStudentsList savedStudents={history} />
    </section>
  );
};

export default CompanyStatsSection;
