import { notFound } from "next/navigation";

import AttendanceExport from "@/components/AttendanceExport";
import { getAttendanceExport } from "@/application/services/attendanceExportService";
import getServerSession from "@/application/services/sessionService";
import { branding } from "@/edition/branding";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams?: Promise<{ day?: string }>;
} = {}) {
  const session = await getServerSession();
  if (!session?.adminRole) notFound();
  const requestedDay = Number((await searchParams)?.day);
  const day = Number.isInteger(requestedDay)
    ? Math.min(Math.max(requestedDay, 1), branding.event.days.length)
    : 1;
  const rows = await getAttendanceExport(day);
  return (
    <AttendanceExport
      rows={rows}
      day={day}
      days={branding.event.scheduleDayTitles}
    />
  );
}
