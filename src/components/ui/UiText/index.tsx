"use client";

import { useUiText } from "@/contexts/UiLanguageContext";

export default function UiText({ text }: { text: string }) {
  return useUiText()(text);
}
