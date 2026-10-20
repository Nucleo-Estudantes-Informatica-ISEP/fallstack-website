import "server-only";

import { HttpError } from "@/types/HttpError";
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

async function readPublicData<T>(read: Promise<T>): Promise<T> {
  try {
    return await read;
  } catch {
    throw new HttpError("Something went wrong", 500);
  }
}

export const getPublicFaqs = (language: Language) =>
  readPublicData(
    publicDataCache.read(
      "faqs",
      language,
      async () => (await getFaqEntries()).map((faq) => toFaqDto(faq, language)),
      reportLoadError("faqs")
    )
  );

export const getPublicSchedule = (language: Language) =>
  readPublicData(
    publicDataCache.read(
      "schedule",
      language,
      async () =>
        (await getScheduleEvents()).map((event) =>
          toScheduleEventDto(event, language)
        ),
      reportLoadError("schedule")
    )
  );

export const getPublicSponsors = () =>
  readPublicData(
    publicDataCache.read(
      "sponsors",
      Language.PT,
      async () => (await getActiveSponsors()).map(toSponsorDto),
      reportLoadError("sponsors")
    )
  );

export const getPublicCompanyRoster = (language: Language) =>
  readPublicData(
    publicDataCache.read(
      "companies",
      language,
      async () =>
        (await getActiveCompanies()).map((company) =>
          toCompanyRosterDto(company, language)
        ),
      reportLoadError("companies")
    )
  );

export async function readHomepageSection<T>(
  read: Promise<readonly T[]>
): Promise<readonly T[]> {
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
    readHomepageSection(getPublicFaqs(language)),
    readHomepageSection(getPublicSchedule(language)),
    readHomepageSection(getPublicSponsors()),
    readHomepageSection(getPublicCompanyRoster(language)),
  ]);
  return { faqs, schedule, sponsors, companies };
}
