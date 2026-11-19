import "server-only";

import { headers } from "next/headers";

import { resolveLanguage } from "@/domain/i18n/translations";
import { uiText } from "@/domain/i18n/ui";

export async function getUiLanguage() {
  return resolveLanguage((await headers()).get("accept-language"));
}

export async function getUiText() {
  const language = await getUiLanguage();
  return (text: string, values?: Record<string, string | number>) =>
    uiText(language, text, values);
}
