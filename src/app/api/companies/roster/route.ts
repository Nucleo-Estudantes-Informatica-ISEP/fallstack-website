import { publicJson } from "@/lib/http/publicJson";
import { defineHandler } from "@/lib/http/server";
import { getPublicCompanyRoster } from "@/application/services/publicEditionService";
import { resolveRequestLanguage } from "@/domain/i18n/translations";

export const GET = defineHandler({
  auth: "none",
  handler: async ({ req }) => {
    const language = resolveRequestLanguage(
      req.nextUrl.searchParams.get("lang"),
      req.headers.get("accept-language")
    );
    const data = await getPublicCompanyRoster(language);
    return publicJson(data);
  },
});
