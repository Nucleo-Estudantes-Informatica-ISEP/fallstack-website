import { expect, test } from "vitest";

import { uiEnglish, uiText } from "./ui";

test("translates interface labels and interpolates values without treating them as message keys", () => {
  expect(uiText("en", "Informações pessoais")).toBe("Personal information");
  expect(uiText("EN", "Editar {value}", { value: "Nome" })).toBe("Edit Nome");
  expect(uiText("pt", "Editar {value}", { value: "Nome" })).toBe("Editar Nome");
  expect(uiText("en", "Student-created content")).toBe(
    "Student-created content"
  );
  expect(uiText("en", "Editar {value}")).toBe("Edit {value}");
});

test("every English message is nonempty and preserves its interpolation fields", () => {
  for (const [pt, en] of Object.entries(uiEnglish)) {
    expect(en.trim(), pt).not.toBe("");
    expect(en.match(/\{\w+\}/g)?.sort() ?? [], pt).toEqual(
      pt.match(/\{\w+\}/g)?.sort() ?? []
    );
  }
});

test("unknown content cannot resolve inherited object properties", () => {
  expect(uiText("en", "constructor")).toBe("constructor");
  expect(uiText("en", "{toString}")).toBe("{toString}");
});
