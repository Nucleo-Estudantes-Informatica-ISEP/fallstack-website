import {
  Language,
  Translations,
  type TranslationValues,
} from "@/domain/i18n/translations";

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
  activity: Translations.fromJSON(event.activity).get(language),
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
  activity: Translations.fromJSON(event.activity).toJSON(),
});
