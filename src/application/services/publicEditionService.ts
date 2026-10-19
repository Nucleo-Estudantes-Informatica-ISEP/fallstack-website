import "server-only";

import { reportError } from "@/lib/logger";
import { toCompanyRosterDto } from "@/application/dto/companyDto";
import { toFaqDto } from "@/application/dto/faqDto";
import { toScheduleEventDto } from "@/application/dto/scheduleDto";
import { toSponsorDto } from "@/application/dto/sponsorDto";
import { Language } from "@/domain/i18n/translations";

import { getActiveCompanies } from "./companyService";
import { getFaqEntries } from "./faqService";
import { publicDataCache } from "./publicDataCache";
import { getScheduleEvents } from "./scheduleService";
import { getActiveSponsors } from "./sponsorService";

export const getPublicFaqs = (language: Language) =>
  publicDataCache.read("faqs", language, async () =>
    (await getFaqEntries()).map((faq) => toFaqDto(faq, language))
  );

export const getPublicSchedule = (language: Language) =>
  publicDataCache.read("schedule", language, async () =>
    (await getScheduleEvents()).map((event) =>
      toScheduleEventDto(event, language)
    )
  );

export const getPublicSponsors = () =>
  publicDataCache.read("sponsors", Language.PT, async () =>
    (await getActiveSponsors()).map(toSponsorDto)
  );

export const getPublicCompanyRoster = (language: Language) =>
  publicDataCache.read("companies", language, async () =>
    (await getActiveCompanies()).map((company) =>
      toCompanyRosterDto(company, language)
    )
  );

async function homepageSection<T>(
  section: string,
  read: Promise<T[]>
): Promise<T[]> {
  try {
    return await read;
  } catch (error) {
    reportError(
      error,
      { operation: `homepage_${section}` },
      "Homepage section unavailable"
    );
    return [];
  }
}

export async function getHomepageData(language: Language) {
  const [faqs, schedule, sponsors, companies] = await Promise.all([
    homepageSection("faqs", getPublicFaqs(language)),
    homepageSection("schedule", getPublicSchedule(language)),
    homepageSection("sponsors", getPublicSponsors()),
    homepageSection("companies", getPublicCompanyRoster(language)),
  ]);
  return { faqs, schedule, sponsors, companies };
}
