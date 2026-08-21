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
  const preferences = value
    ?.split(",")
    .map((entry, index) => {
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
        index,
      };
    })
    .filter(
      (preference): preference is typeof preference & { language: Language } =>
        preference.language !== undefined && preference.quality > 0
    )
    .sort(
      (left, right) => right.quality - left.quality || left.index - right.index
    );

  return preferences?.[0]?.language ?? Language.PT;
}
