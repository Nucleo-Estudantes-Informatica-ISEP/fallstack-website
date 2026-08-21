import { describe, expect, test } from "vitest";

import { Language, resolveLanguage, Translations } from "./translations";

describe("Translations", () => {
  test("reads both translations", () => {
    const translations = Translations.fromJSON({ PT: "Olá", EN: "Hello" });

    expect(translations.get(Language.PT)).toBe("Olá");
    expect(translations.get(Language.EN)).toBe("Hello");
  });

  test("falls back to migrated Portuguese text when English is missing", () => {
    const translations = Translations.fromJSON({ PT: "Olá" });

    expect(translations.get(Language.EN)).toBe("Olá");
    expect(translations.toJSON()).toEqual({ PT: "Olá", EN: "Olá" });
  });

  test("rejects malformed database JSON", () => {
    expect(() => Translations.fromJSON({ EN: "Hello" })).toThrow();
    expect(() => Translations.fromJSON({ PT: "Olá", FR: "Salut" })).toThrow();
  });
});

test("resolveLanguage accepts browser locale values", () => {
  expect(resolveLanguage("en-GB,en;q=0.9")).toBe(Language.EN);
  expect(resolveLanguage("pt-PT,pt;q=0.9")).toBe(Language.PT);
  expect(resolveLanguage("fr-FR,fr;q=0.9,en;q=0.8")).toBe(Language.EN);
  expect(resolveLanguage("en;q=0,pt;q=1")).toBe(Language.PT);
  expect(resolveLanguage(undefined)).toBe(Language.PT);
});
