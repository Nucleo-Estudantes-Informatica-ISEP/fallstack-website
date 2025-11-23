"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Company, Interest } from "@prisma/client";
import Skeleton from "react-loading-skeleton";
import swal from "sweetalert";

import { HistoryData } from "@/types/HistoryData";
import { BASE_URL } from "@/services/api";
import OpenCvSectionCompany from "@/components/Companies/CompanyProfile/OpenCvSectionCompany";
import { formatDateDDStrMonthHourMin } from "@/utils/date";

interface HistorySectionProps {
  company: Company;
}

const CompanySavesSection = ({ company }: HistorySectionProps) => {
  const [historyData, setHistoryData] = useState<HistoryData[] | null>(null);

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        const response = await fetch(BASE_URL + "/companies/history");
        const data = await response.json();

        if (data.error) swal("Erro ao buscar histórico de scans!");

        setHistoryData(data);
      } catch (error) {
        console.error("Error fetching history data:", error);
      }
    };

    fetchHistoryData();
  }, [company]);

  function shuffleArray<T>(array: T[]) {
    const newArr: T[] = array.map((e) => e);
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  return (
    <div className="my-4 flex w-full flex-col items-center justify-center text-white">
      <div
        className="firefox-scrollbar-margin max-h-80 w-full overflow-y-scroll pl-1 scrollbar scrollbar-track-transparent scrollbar-thumb-slate-500 scrollbar-thumb-rounded-lg scrollbar-w-1"
        style={{ scrollbarGutter: "stable" }}
      >
        {!historyData ? (
          Array(3)
            .fill(1)
            .map((_, i) => (
              <div
                key={i}
                className="flex flex-row items-center border-t border-gray-700 py-4 first:border-0"
              >
                <div className="flex w-full justify-center">
                  <Skeleton containerClassName="flex-1" baseColor="#333" highlightColor="#444" />
                </div>
              </div>
            ))
        ) : !historyData.length ? (
          <div className="flex flex-row py-3">
            <div className="flex w-full justify-center text-gray-400">Sem perfis salvos.</div>
          </div>
        ) : (
          historyData.map((item) => (
            <div
              key={item.studentId}
              className="flex flex-row items-center justify-between border-b border-gray-700 py-4 last:border-0"
            >
              <div className="flex flex-1 items-center justify-center px-4 text-center">
                <Link
                  href={"/student/" + item.student.code}
                  className="font-bold text-white hover:underline"
                >
                  {item.student.name}
                </Link>
              </div>
              <div className="flex flex-1 items-center justify-center px-4 text-center text-gray-300">
                {formatDateDDStrMonthHourMin(item.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CompanySavesSection;
