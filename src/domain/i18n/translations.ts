import { z } from "zod";

export enum Language {
  PT = "PT",
  EN = "EN",
}

export type TranslationValues = Record<Language, string>;
export type ParsedTranslatedField<T, K extends keyof T> = Omit<T, K> &
  Record<K, TranslationValues>;

export const translationsSchema = z
  .object({
    [Language.PT]: z.string(),
    [Language.EN]: z.string().optional(),
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

export const toTranslationJson = (
  value: TranslationValues
): Record<string, string> => Translations.create(value).toJSON();

export function parseTranslatedField<T extends object, K extends keyof T>(
  entity: T,
  field: K
): ParsedTranslatedField<T, K> {
  return parseTranslatedFields(entity, field);
}

export function parseTranslatedFields<T extends object, K extends keyof T>(
  entity: T,
  ...fields: K[]
): ParsedTranslatedField<T, K> {
  return fields.reduce(
    (parsed, field) => ({
      ...parsed,
      [field]: Translations.fromJSON(entity[field]).toJSON(),
    }),
    entity
  ) as ParsedTranslatedField<T, K>;
}

export function resolveLanguage(value: string | null | undefined): Language {
  const preferences = value
    ?.split(",")
    .map((entry) => {
      const [tag = "", ...parameters] = entry.trim().toLowerCase().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q=")
      );
      const quality = qualityParameter
        ? Number(qualityParameter.trim().slice(2))
        : 1;
      const baseLanguage = tag.split("-")[0];
      const language =
        baseLanguage === "en"
          ? Language.EN
          : baseLanguage === "pt" || baseLanguage === "*"
            ? Language.PT
            : undefined;

      return {
        language,
        quality:
          Number.isFinite(quality) && quality >= 0 && quality <= 1
            ? quality
            : 0,
      };
    })
    .filter(
      (preference): preference is typeof preference & { language: Language } =>
        preference.language !== undefined && preference.quality > 0
    )
    .sort((left, right) => right.quality - left.quality);

  return preferences?.[0]?.language ?? Language.PT;
}

export function resolveRequestLanguage(
  queryLanguage: string | string[] | null | undefined,
  acceptLanguage: string | null | undefined
): Language {
  const requested = Array.isArray(queryLanguage)
    ? queryLanguage[0]
    : queryLanguage;
  return resolveLanguage(requested ?? acceptLanguage);
}
