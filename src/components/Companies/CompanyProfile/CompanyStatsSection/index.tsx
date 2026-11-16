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
import StatCounters from "@/components/StatCounters";
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
    <section className="flex w-full flex-col items-center justify-center">
      <h2 className="w-full text-2xl font-semibold text-white">
        Sumário da empresa
      </h2>
      <StatCounters
        items={[
          { value: totalScans, label: totalScans === 1 ? "Scan" : "Scans" },
          {
            value: totalSaves,
            label:
              totalSaves === 1 ? "Gravação de Perfil" : "Gravações de Perfil",
          },
          {
            value: studentsLeft,
            label: studentsLeft === 1 ? "Aluno restante" : "Alunos restantes",
          },
        ]}
      />
      <h2
        id="company-interests-heading"
        className="mx-auto mb-4 w-full text-center text-xl font-semibold"
      >
        Interesses
      </h2>
      {/* The shared selector pads its tags only when left-aligned; this keeps
          the summary centred and gives the tags the student's padding. */}
      <div
        role="group"
        aria-labelledby="company-interests-heading"
        className="w-full [&_button]:px-5 sm:[&_button]:px-7"
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
