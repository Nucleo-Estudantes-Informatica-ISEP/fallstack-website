import { notFound } from "next/navigation";

import AttendanceExport from "@/components/AttendanceExport";
import { getAttendanceExport } from "@/application/services/attendanceExportService";
import getServerSession from "@/application/services/sessionService";
import { branding } from "@/edition/branding";

export default async function AttendancePage() {
  const session = await getServerSession();
  if (!session?.adminRole) notFound();
  const rows = [];
  for (let day = 1; day <= branding.event.days.length; day++) {
    rows.push(await getAttendanceExport(day));
  }
  return (
    <AttendanceExport rows={rows} days={branding.event.scheduleDayTitles} />
  );
}
