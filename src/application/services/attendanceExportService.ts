import "server-only";

import { attendanceExportRow } from "@/domain/session/attendanceExport";
import { branding } from "@/edition/branding";

import { findAttendanceForExport } from "../repositories/sessionCheckInRepository";

export async function getAttendanceExport(day: number) {
  const rows = await findAttendanceForExport(day);
  return rows.map((row) =>
    attendanceExportRow(row, branding.event.days, branding.event.startsAt)
  );
}
