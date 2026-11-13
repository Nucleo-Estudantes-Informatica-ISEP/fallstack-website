"use client";

import { useState } from "react";

import ExcelButton from "@/components/ExcelButton";

export default function AttendanceExport({
  rows,
  days,
}: {
  rows: Record<string, string>[][];
  days: readonly string[];
}) {
  const [day, setDay] = useState(0);
  return (
    <section className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Exportar presenças</h1>
      <label className="block">
        Dia{" "}
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="min-h-11 border p-2"
        >
          {days.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>{rows[day].length} registos de presença. Horas em UTC.</p>
      <div className="flex flex-wrap gap-4">
        <ExcelButton
          headers={[
            "Name",
            "Email",
            "Student number",
            "Date",
            "Session",
            "Check-in time",
            "Valid until",
          ]}
          rows={rows[day]}
          filename={`attendance-day-${day + 1}`}
        />
        <ExcelButton
          headers={[
            "Name",
            "Email",
            "Student number",
            "Date",
            "Session",
            "Check-in time",
            "Valid until",
          ]}
          rows={rows[day]}
          filename={`attendance-day-${day + 1}`}
          format="csv"
        />
      </div>
    </section>
  );
}
