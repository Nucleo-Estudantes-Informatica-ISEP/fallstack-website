import type { HomepageDto } from "@/application/dto/homepageDto";
import {
  getPublicCompanyRoster,
  getPublicFaqs,
  getPublicSchedule,
  getPublicSponsors,
} from "@/application/services/publicEditionService";
import type { Language } from "@/domain/i18n/translations";

// Collect the independently streamed section reads for assertions and benchmarks.
export async function readHomepageDatasets(
  language: Language
): Promise<HomepageDto> {
  const [faqs, schedule, sponsors, companies] = await Promise.all([
    getPublicFaqs(language),
    getPublicSchedule(language),
    getPublicSponsors(),
    getPublicCompanyRoster(language),
  ]);
  return { faqs, schedule, sponsors, companies };
}
