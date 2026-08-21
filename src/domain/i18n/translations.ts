import { z } from "zod";

export enum Language {
  PT = "PT",
  EN = "EN",
}

export type TranslationValues = Record<Language, string>;

export const translationsSchema = z
  .object({
    [Language.PT]: z.string().min(1),
    [Language.EN]: z.string().min(1).optional(),
  })
  .strict();

export class Translations {
  private constructor(private readonly values: TranslationValues) {}

  static fromJSON(value: unknown) {
    const parsed = translationsSchema.parse(value);
    return new Translations({
      [Language.PT]: parsed.PT,
      [Language.EN]: parsed.EN ?? parsed.PT,
    });
  }

  static create(values: TranslationValues) {
    return Translations.fromJSON(values);
  }

  get(language: Language) {
    return this.values[language];
  }

  toJSON(): TranslationValues {
    return { ...this.values };
  }
}

export function resolveLanguage(value: string | null | undefined): Language {
  return value?.toLowerCase().startsWith("en") ? Language.EN : Language.PT;
}
