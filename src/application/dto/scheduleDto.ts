import { Language, type TranslationValues } from "@/domain/i18n/translations";

export interface ScheduleEventDto {
  id: string;
  day: number;
  order: number;
  startTime: string;
  endTime: string;
  activity: string;
}

interface ScheduleEventEntity extends Omit<ScheduleEventDto, "activity"> {
  activity: TranslationValues;
}

export const toScheduleEventDto = (
  event: ScheduleEventEntity,
  language: Language = Language.PT
): ScheduleEventDto => ({
  id: event.id,
  day: event.day,
  order: event.order,
  startTime: event.startTime,
  endTime: event.endTime,
  activity: event.activity[language],
});

export interface AdminScheduleEventDto extends Omit<
  ScheduleEventDto,
  "activity"
> {
  activity: TranslationValues;
}

export const toAdminScheduleEventDto = (
  event: ScheduleEventEntity
): AdminScheduleEventDto => ({
  id: event.id,
  day: event.day,
  order: event.order,
  startTime: event.startTime,
  endTime: event.endTime,
  activity: event.activity,
});
