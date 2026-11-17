import { attendancePeriodsForDay } from "./attendancePeriods";

function dateAtEventOffset(date: Date, startsAt: string) {
  const match = startsAt.match(/([+-])(\d{2}):?(\d{2})$/);
  if (!match) return date.toISOString().slice(0, 10);
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  const offset = (match[1] === "+" ? 1 : -1) * minutes;
  return new Date(date.getTime() + offset * 60_000).toISOString().slice(0, 10);
}

export function attendanceExportRow(
  checkIn: {
    checkedInAt: Date;
    student: { name: string; user: { email: string } };
    day: number;
    period: "MORNING" | "AFTERNOON";
  },
  days: readonly number[],
  startsAt: string
) {
  const period = attendancePeriodsForDay(checkIn.day).find(
    (item) => item.period === checkIn.period
  );
  if (!period || !days[checkIn.day - 1])
    throw new Error("Invalid attendance period");
  const email = checkIn.student.user.email;
  // Student numbers are verified institutional email local parts; staff have none.
  const number = email.match(/^(\d{7})@isep\.ipp\.pt$/i)?.[1] ?? "";
  return {
    Name: checkIn.student.name,
    Email: email,
    "Student number": number,
    Date: dateAtEventOffset(new Date(period.start), startsAt),
    Period: period.title,
    "Check-in time": checkIn.checkedInAt.toISOString(),
    "Valid until": period.end,
  };
}
