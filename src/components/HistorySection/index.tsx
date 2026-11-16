"use client";

import { useId } from "react";
import Link from "next/link";

import type { SavedStudentDto } from "@/application/dto/historyDto";
import { formatDateDDStrMonthHourMin } from "@/utils/date";

interface HistorySectionProps {
  historyData: SavedStudentDto[];
  isCompany?: boolean;
}

const headerCell =
  "sticky top-0 border-b border-ui-border bg-background px-2 pb-2 text-sm font-normal text-ui-muted md:pb-3 md:text-center md:text-base";
const bodyCell = "px-2 py-3 align-top md:py-4 md:text-center";

const HistorySection = ({ historyData, isCompany }: HistorySectionProps) => {
  const captionId = useId();

  return (
    // Focusable so keyboard users can scroll the list when it overflows.
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className="ui-focus firefox-scrollbar-margin scrollbar-thumb-rounded-lg scrollbar-w-1 mt-8 scrollbar max-h-80 w-full scrollbar-thumb-slate-500 scrollbar-track-transparent scrollbar-gutter-stable overflow-y-auto md:mt-10"
    >
      <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm text-white md:text-base">
        <caption id={captionId} className="sr-only">
          Histórico de scans
        </caption>
        <colgroup>
          <col className="w-1/2" />
          <col className="w-1/4" />
          <col className="w-1/4" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={headerCell}>
              Nome
            </th>
            <th scope="col" className={`${headerCell} border-l md:border-l-0`}>
              Data
            </th>
            <th scope="col" className={`${headerCell} border-l md:border-l-0`}>
              Ação
            </th>
          </tr>
        </thead>
        <tbody className="[&>tr+tr>td]:border-t [&>tr+tr>td]:border-ui-border">
          {!historyData.length ? (
            <tr>
              <td colSpan={3} className="px-2 py-4 text-center">
                Os teus scans aparecerão aqui!
              </td>
            </tr>
          ) : (
            historyData.map((item) => (
              <tr key={`${item.studentId}-${item.createdAt}`}>
                <td className={`${bodyCell} font-semibold wrap-break-word`}>
                  {isCompany ? (
                    <Link
                      href={`/student/${item.student.code}/preview`}
                      className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {item.student.name}
                    </Link>
                  ) : (
                    item.savedBy.company?.name
                  )}
                </td>
                <td className={bodyCell}>
                  <time dateTime={item.createdAt}>
                    {formatDateDDStrMonthHourMin(item.createdAt)}
                  </time>
                </td>
                <td className={`${bodyCell} font-bold text-primary`}>SALVO</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default HistorySection;
