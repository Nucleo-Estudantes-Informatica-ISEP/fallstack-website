"use client";

import Link from "next/link";

import type { SavedStudentDto } from "@/application/dto/historyDto";
import { formatDateDDStrMonthHourMin } from "@/utils/date";

interface CompanySavedStudentsListProps {
  savedStudents: SavedStudentDto[];
}

// Company-only list of saved students for the Sumário tab. Styled like the
// student dashboard's history list (src/components/HistorySection), kept as
// separate code. Names wrap to two lines and longer ones are clamped (full
// name on hover and for screen readers); below `sm` the always-"SALVO"
// column is hidden so the name and date fit at 360 px.
const CompanySavedStudentsList: React.FC<CompanySavedStudentsListProps> = ({
  savedStudents,
}) => {
  if (!savedStudents.length) {
    return (
      <p className="mt-12 mb-8 w-full py-3 text-center text-white/70">
        Ainda não há perfis guardados. Os estudantes que guardar aparecem aqui.
      </p>
    );
  }

  return (
    <div
      className="firefox-scrollbar-margin scrollbar-thumb-rounded-lg scrollbar-w-1 mt-12 mb-8 scrollbar max-h-80 w-full scrollbar-thumb-slate-500 scrollbar-track-transparent overflow-y-auto pl-1"
      style={{ scrollbarGutter: "stable" }}
    >
      <table className="w-full table-fixed border-collapse text-center">
        <caption className="sr-only">Perfis guardados</caption>
        <thead className="sticky top-0 bg-background">
          <tr className="border-b-2 font-bold text-white/70">
            <th scope="col" className="w-auto px-1 py-3 sm:w-1/2">
              Nome
            </th>
            <th scope="col" className="w-24 px-1 py-3 sm:w-1/4">
              Data
            </th>
            <th scope="col" className="hidden w-1/4 px-1 py-3 sm:table-cell">
              Ação
            </th>
          </tr>
        </thead>
        <tbody>
          {savedStudents.map((item) => (
            <tr
              key={`${item.studentId}-${item.createdAt}`}
              className="border-t-2 first:border-0"
            >
              <td className="px-1 py-4 font-bold">
                <Link
                  href={`/student/${item.student.code}/preview`}
                  title={item.student.name}
                  className="line-clamp-2 rounded-sm wrap-break-word hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {item.student.name}
                </Link>
              </td>
              <td className="px-1 py-4 whitespace-nowrap">
                <time dateTime={item.createdAt}>
                  {formatDateDDStrMonthHourMin(item.createdAt)}
                </time>
              </td>
              <td className="hidden px-1 py-4 font-bold sm:table-cell">
                <span className="text-primary">SALVO</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompanySavedStudentsList;
