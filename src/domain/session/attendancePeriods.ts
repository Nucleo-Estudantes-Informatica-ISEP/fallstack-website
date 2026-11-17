import { branding } from "@/edition/branding";

import { getSessionWindow } from "./sessionRules";

const periods = [
  { period: "MORNING", title: "Manhã", startTime: "09:30", endTime: "12:00" },
  { period: "AFTERNOON", title: "Tarde", startTime: "14:00", endTime: "18:00" },
] as const;

export function attendancePeriodsForDay(day: number) {
  if (!Number.isInteger(day) || day < 1 || day > branding.event.days.length)
    return [];
  return periods.map((period) => {
    const window = getSessionWindow(
      { day, ...period },
      branding.event.days,
      branding.event.startsAt
    )!;
    return {
      ...period,
      day,
      id: `${day}-${period.period.toLowerCase()}`,
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      dayTitle: branding.event.scheduleDayTitles[day - 1],
    };
  });
}

export function findAttendancePeriod(id: string) {
  return branding.event.days
    .flatMap((_, index) => attendancePeriodsForDay(index + 1))
    .find((period) => period.id === id);
}
