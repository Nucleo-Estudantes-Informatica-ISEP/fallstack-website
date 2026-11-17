"use client";

import { useUiText } from "@/contexts/UiLanguageContext";
import ExcelButton from "@/components/ExcelButton";

export function formatAttendanceTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

const headers = [
  "Name",
  "Email",
  "Student number",
  "Date",
  "Period",
  "Check-in time",
  "Valid until",
];

export default function AttendanceExport({
  rows,
  day,
  days,
}: {
  rows: Record<string, string>[];
  day: number;
  days: readonly string[];
}) {
  const t = useUiText();

  return (
    <section className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">{t("Presenças")}</h1>
      <label className="block">
        {t("Dia")}{" "}
        <select
          value={day - 1}
          onChange={(e) => {
            window.location.href = `/attendance?day=${Number(e.target.value) + 1}`;
          }}
          className="min-h-11 border p-2"
        >
          {days.map((label, index) => (
            <option key={label} value={index}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>
      <p>
        {rows.length} {t("registos de presença. Horas em UTC.")}
      </p>
      <div className="flex flex-wrap gap-4">
        <ExcelButton
          headers={headers}
          rows={rows}
          filename={`attendance-day-${day}`}
        />
        <ExcelButton
          headers={headers}
          rows={rows}
          filename={`attendance-day-${day}`}
          format="csv"
        />
      </div>
      <div className="overflow-x-auto rounded-lg bg-white shadow-md">
        <table className="min-w-full border-collapse text-left">
          <caption className="sr-only">
            {t("Presenças —")} {t(days[day - 1])}
          </caption>
          <thead className="bg-gray-200 text-sm text-gray-700">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className="px-6 py-3 whitespace-nowrap"
                >
                  {
                    [
                      t("Nome"),
                      "Email",
                      t("Número de estudante"),
                      t("Data"),
                      t("Período"),
                      t("Hora de entrada (UTC)"),
                      t("Válido até (UTC)"),
                    ][index]
                  }
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-gray-600">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-8 text-center">
                  {t("Sem presenças registadas neste dia.")}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="border-b hover:bg-gray-100">
                  {headers.map((header) => (
                    <td key={header} className="px-6 py-4 whitespace-nowrap">
                      {header === "Check-in time" || header === "Valid until"
                        ? formatAttendanceTime(row[header] ?? "")
                        : header === "Period"
                          ? t(row[header] ?? "")
                          : row[header]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
