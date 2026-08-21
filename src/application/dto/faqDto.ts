import {
  Language,
  Translations,
  type TranslationValues,
} from "@/domain/i18n/translations";

export interface FaqDto {
  id: string;
  question: string;
  answer: string;
  order: number;
}

interface FaqEntity {
  id: string;
  question: TranslationValues;
  answer: TranslationValues;
  order: number;
}

export const toFaqDto = (
  faq: FaqEntity,
  language: Language = Language.PT
): FaqDto => ({
  id: faq.id,
  question: Translations.fromJSON(faq.question).get(language),
  answer: Translations.fromJSON(faq.answer).get(language),
  order: faq.order,
});

export interface AdminFaqDto {
  id: string;
  question: TranslationValues;
  answer: TranslationValues;
  order: number;
}

export const toAdminFaqDto = (faq: FaqEntity): AdminFaqDto => ({
  id: faq.id,
  question: Translations.fromJSON(faq.question).toJSON(),
  answer: Translations.fromJSON(faq.answer).toJSON(),
  order: faq.order,
});
