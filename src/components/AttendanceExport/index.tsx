"use client";

import ExcelButton from "@/components/ExcelButton";

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
  return (
    <section className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Presenças</h1>
      <label className="block">
        Dia{" "}
        <select
          value={day - 1}
          onChange={(e) => {
            window.location.href = `/attendance?day=${Number(e.target.value) + 1}`;
          }}
          className="min-h-11 border p-2"
        >
          {days.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>{rows.length} registos de presença. Horas em UTC.</p>
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
          <caption className="sr-only">Presenças — {days[day - 1]}</caption>
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
                      "Nome",
                      "Email",
                      "Número de estudante",
                      "Data",
                      "Período",
                      "Hora de entrada (UTC)",
                      "Válido até (UTC)",
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
                  Sem presenças registadas neste dia.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="border-b hover:bg-gray-100">
                  {headers.map((header) => (
                    <td key={header} className="px-6 py-4 whitespace-nowrap">
                      {row[header]}
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
