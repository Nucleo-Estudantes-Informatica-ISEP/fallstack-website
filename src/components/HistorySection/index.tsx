"use client";

import Link from "next/link";

import { SavedStudentWithSavedBy } from "@/types/SavedStudentWithSavedBy";
import { formatDateDDStrMonthHourMin } from "@/utils/date";

interface HistorySectionProps {
  historyData: SavedStudentWithSavedBy[];
  isCompany?: boolean;
}

const HistorySection = ({ historyData, isCompany }: HistorySectionProps) => {
  return (
    <div className="mt-12 mb-8 flex w-full flex-col items-center justify-center">
      <div className="grid w-full grid-cols-4 border-b-2 px-1 py-3 text-center font-bold text-white/35">
        <div className="col-span-2 px-1">Nome</div>
        <div className="px-1">Data</div>
        <div className="px-1">Ação</div>
      </div>
      <div
        className="firefox-scrollbar-margin scrollbar scrollbar-track-transparent scrollbar-thumb-slate-500 scrollbar-thumb-rounded-lg scrollbar-w-1 max-h-80 w-full overflow-y-auto pl-1"
        style={{ scrollbarGutter: "stable" }}
      >
        {!historyData.length ? (
          <div className="flex flex-row py-3">
            <div className="flex w-full justify-center">
              Os teus scans aparecerão aqui!
            </div>
          </div>
        ) : (
          historyData.map((item) => (
            <div
              key={`${item.studentId}-${item.createdAt}`}
              className="grid w-full grid-cols-4 border-t-2 py-4 text-center first:border-0"
            >
              <div className="col-span-2 px-1 font-bold">
                {isCompany ? (
                  <Link
                    href={`/student/${item.student.code}/preview`}
                    className="w-full truncate hover:underline"
                  >
                    {item.student.name}
                  </Link>
                ) : (
                  <span className="w-full truncate">
                    {item.savedBy.company.name}
                  </span>
                )}
              </div>
              <div className="justify-center px-1">
                {formatDateDDStrMonthHourMin(item.createdAt)}
              </div>
              <div className="justify-center px-1 font-bold">
                <span className="text-primary">SALVO</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorySection;
