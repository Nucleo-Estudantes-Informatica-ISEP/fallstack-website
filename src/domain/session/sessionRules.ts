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

  const year = eventStartDate.getUTCFullYear();
  const month = String(eventStartDate.getUTCMonth() + 1).padStart(2, "0");
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
