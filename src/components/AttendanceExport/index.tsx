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
      <h1 className="text-2xl font-bold">Exportar presenças</h1>
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
    </section>
  );
}
