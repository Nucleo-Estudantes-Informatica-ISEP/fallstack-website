export function getSessionWindow(
  event: { day: number; startTime: string; endTime: string },
  eventDays: readonly number[],
  eventStart: string
) {
  const eventStartDate = new Date(eventStart);
  const dayOfMonth = eventDays[event.day - 1];
  if (
    Number.isNaN(eventStartDate.getTime()) ||
    dayOfMonth === undefined ||
    !/^\d{2}:\d{2}$/.test(event.startTime) ||
    !/^\d{2}:\d{2}$/.test(event.endTime)
  )
    return null;

  const [year, month] = eventStart.split("T")[0].split("-");
  const day = String(dayOfMonth).padStart(2, "0");
  const offset = eventStart.match(/([+-]\d{2}:\d{2})$/)?.[1] ?? "Z";
  const start = new Date(
    `${year}-${month}-${day}T${event.startTime}:00${offset}`
  );
  const end = new Date(`${year}-${month}-${day}T${event.endTime}:00${offset}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

export function isWithinSession(now: Date, window: { start: Date; end: Date }) {
  return now >= window.start && now <= window.end;
}

type SessionWindow = { start: Date; end: Date };

export type SessionStatus = "running" | "upcoming" | "ended";

/** 1-based event day for `now` at the event's UTC offset, or null. */
export function eventDayIndex(
  now: Date,
  eventDays: readonly number[],
  eventStart: string
): number | null {
  const match = eventStart.match(/([+-])(\d{2}):?(\d{2})$/);
  const offsetMinutes = match
    ? (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3]))
    : 0;
  const local = new Date(now.getTime() + offsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
  const [year, month, day] = local.split("-");
  if (`${year}-${month}` !== eventStart.slice(0, 7)) return null;
  const index = eventDays.indexOf(Number(day));
  return index === -1 ? null : index + 1;
}

export function sessionStatus(window: SessionWindow, now: Date): SessionStatus {
  if (isWithinSession(now, window)) return "running";
  return now < window.start ? "upcoming" : "ended";
}

/**
 * The running session that started last; otherwise the next upcoming one;
 * otherwise the one that ended last.
 */
export function pickCurrentSession<T extends SessionWindow>(
  sessions: readonly T[],
  now: Date
): T | null {
  const running = sessions
    .filter((session) => isWithinSession(now, session))
    .sort((a, b) => b.start.getTime() - a.start.getTime());
  if (running.length) return running[0];
  const upcoming = sessions
    .filter((session) => now < session.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (upcoming.length) return upcoming[0];
  return (
    [...sessions].sort((a, b) => b.end.getTime() - a.end.getTime())[0] ?? null
  );
}
