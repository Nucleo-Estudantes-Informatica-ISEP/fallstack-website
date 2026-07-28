"use client";

import { FunctionComponent, useEffect, useState } from "react";

import { httpClient } from "@/lib/http/client";
import Schedule, { type ScheduleDay } from "@/components/Schedule";
import type { ScheduleEventDto } from "@/application/dto/scheduleDto";

interface ScheduleSectionProps {
  firstDayTitle: string;
  secondDayTitle: string;
}

// "09:45" -> "09.45h", matching the site's existing time notation (Schedule
// itself just renders whatever "hour" string it's given).
const formatHour = (time: string) => `${time.replace(":", ".")}h`;

// Schedule always indexes scheduleEvents[0]/[1] for its two day tabs
// (firstDayTitle/secondDayTitle), so always return exactly two arrays -
// even if a day currently has no events - rather than however many
// distinct `day` values happen to be present in the data.
function groupByDay(events: ScheduleEventDto[]): ScheduleDay[][] {
  return [1, 2].map((day) =>
    events
      .filter((event) => event.day === day)
      .sort((a, b) => a.order - b.order)
      .map((event) => ({
        hour: formatHour(event.startTime),
        activity: event.activity,
      }))
  );
}

const ScheduleSection: FunctionComponent<ScheduleSectionProps> = ({
  firstDayTitle,
  secondDayTitle,
}) => {
  const [events, setEvents] = useState<ScheduleEventDto[] | null>(null);

  useEffect(() => {
    httpClient
      .get<ScheduleEventDto[]>("/schedule")
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  if (!events) return null;

  return (
    <Schedule
      firstDayTitle={firstDayTitle}
      secondDayTitle={secondDayTitle}
      scheduleEvents={groupByDay(events)}
    />
  );
};

export default ScheduleSection;
