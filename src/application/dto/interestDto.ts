import { Language, type TranslationValues } from "@/domain/i18n/translations";

export interface InterestDto {
  id: string;
  name: string;
}

interface InterestEntity {
  id: string;
  name: TranslationValues;
}

export const toInterestDto = (
  interest: InterestEntity,
  language: Language = Language.PT
): InterestDto => ({
  id: interest.id,
  name: interest.name[language],
});

export interface AdminInterestDto {
  id: string;
  name: TranslationValues;
}

export const toAdminInterestDto = (
  interest: InterestEntity
): AdminInterestDto => ({
  id: interest.id,
  name: interest.name,
});
