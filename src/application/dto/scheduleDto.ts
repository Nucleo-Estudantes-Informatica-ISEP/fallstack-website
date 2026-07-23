export interface ScheduleEventDto {
  id: string;
  day: number;
  order: number;
  startTime: string;
  endTime: string;
  activity: string;
}

export const toScheduleEventDto = (
  event: ScheduleEventDto
): ScheduleEventDto => ({
  id: event.id,
  day: event.day,
  order: event.order,
  startTime: event.startTime,
  endTime: event.endTime,
  activity: event.activity,
});
