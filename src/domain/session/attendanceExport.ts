import { getSessionWindow } from "./sessionRules";

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
    Date: window.start.toISOString().slice(0, 10),
    Session: title,
    "Check-in time": checkIn.checkedInAt.toISOString(),
    "Valid until": window.end.toISOString(),
  };
}
