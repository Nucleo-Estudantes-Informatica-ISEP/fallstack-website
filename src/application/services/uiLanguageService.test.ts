import { headers } from "next/headers";
import { expect, test, vi } from "vitest";

import { getUiLanguage, getUiText } from "./uiLanguageService";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

test("server copy uses the request language set by the language-cookie middleware", async () => {
  vi.mocked(headers).mockResolvedValue(
    new Headers({ "accept-language": "en-GB" }) as never
  );
  expect(await getUiLanguage()).toBe("EN");
  expect((await getUiText())("Estudantes")).toBe("Students");
  vi.mocked(headers).mockResolvedValue(
    new Headers({ "accept-language": "pt-PT" }) as never
  );
  expect((await getUiText())("Estudantes")).toBe("Estudantes");
});
