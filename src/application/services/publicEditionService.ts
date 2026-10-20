import "server-only";

import { reportError } from "@/lib/logger";
import { toCompanyRosterDto } from "@/application/dto/companyDto";
import { toFaqDto } from "@/application/dto/faqDto";
import type { HomepageDto } from "@/application/dto/homepageDto";
import { toScheduleEventDto } from "@/application/dto/scheduleDto";
import { toSponsorDto } from "@/application/dto/sponsorDto";
import { Language } from "@/domain/i18n/translations";

import { getActiveCompanies } from "./companyService";
import { getFaqEntries } from "./faqService";
import { publicDataCache } from "./publicDataCache";
import { getScheduleEvents } from "./scheduleService";
import { getActiveSponsors } from "./sponsorService";

// The callback runs once per cache load, never once per waiting visitor.
const reportLoadError = (section: string) => (error: unknown) =>
  reportError(
    error,
    { operation: `homepage_${section}` },
    "Public homepage data unavailable"
  );

export const getPublicFaqs = (language: Language) =>
  publicDataCache.read(
    "faqs",
    language,
    async () => (await getFaqEntries()).map((faq) => toFaqDto(faq, language)),
    reportLoadError("faqs")
  );

export const getPublicSchedule = (language: Language) =>
  publicDataCache.read(
    "schedule",
    language,
    async () =>
      (await getScheduleEvents()).map((event) =>
        toScheduleEventDto(event, language)
      ),
    reportLoadError("schedule")
  );

export const getPublicSponsors = () =>
  publicDataCache.read(
    "sponsors",
    Language.PT,
    async () => (await getActiveSponsors()).map(toSponsorDto),
    reportLoadError("sponsors")
  );

export const getPublicCompanyRoster = (language: Language) =>
  publicDataCache.read(
    "companies",
    language,
    async () =>
      (await getActiveCompanies()).map((company) =>
        toCompanyRosterDto(company, language)
      ),
    reportLoadError("companies")
  );

async function homepageSection<T>(read: Promise<T[]>): Promise<T[]> {
  try {
    return await read;
  } catch {
    return [];
  }
}

export async function getHomepageData(
  language: Language
): Promise<HomepageDto> {
  const [faqs, schedule, sponsors, companies] = await Promise.all([
    homepageSection(getPublicFaqs(language)),
    homepageSection(getPublicSchedule(language)),
    homepageSection(getPublicSponsors()),
    homepageSection(getPublicCompanyRoster(language)),
  ]);
  return { faqs, schedule, sponsors, companies };
}
