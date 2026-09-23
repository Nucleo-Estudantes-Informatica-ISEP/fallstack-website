import "server-only";

import type { Prisma } from "@prisma/client";

import { Language } from "@/domain/i18n/translations";

export function translatedFieldWhere(field: string, search?: string) {
  return search
    ? {
        OR: Object.values(Language).map((language) => ({
          [field]: {
            path: [language],
            string_contains: search,
            mode: "insensitive" as const,
          } satisfies Prisma.JsonFilter,
        })),
      }
    : undefined;
}
