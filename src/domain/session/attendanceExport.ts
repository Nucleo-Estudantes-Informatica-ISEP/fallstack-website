import { getSessionWindow } from "./sessionRules";

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
    session: {
      day: number;
      startTime: string;
      endTime: string;
      activity: unknown;
    };
  },
  days: readonly number[],
  startsAt: string
) {
  const window = getSessionWindow(checkIn.session, days, startsAt);
  if (!window) throw new Error("Invalid attendance session window");
  const activity = checkIn.session.activity;
  const title =
    activity && typeof activity === "object" && "PT" in activity
      ? String(activity.PT)
      : "";
  const email = checkIn.student.user.email;
  // Student numbers are verified institutional email local parts; staff have none.
  const number = email.match(/^(\d{7})@isep\.ipp\.pt$/i)?.[1] ?? "";
  return {
    Name: checkIn.student.name,
    Email: email,
    "Student number": number,
    Date: dateAtEventOffset(window.start, startsAt),
    Session: title,
    "Check-in time": checkIn.checkedInAt.toISOString(),
    "Valid until": window.end.toISOString(),
  };
}
