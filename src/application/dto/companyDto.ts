import {
  Fact,
  parseFacts,
  parseSocialLinks,
  SocialLinks,
} from "@/domain/company/companyProfileContent";
import {
  Language,
  Translations,
  type TranslationValues,
} from "@/domain/i18n/translations";

export interface CompanyRankStyleDto {
  gradientFromColor: string;
  gradientFromStop: string;
  gradientToColor: string;
  gradientToStop: string;
  hasInternalPage: boolean;
  showsPromoVideo: boolean;
}

export interface CompanyRankDto {
  id: string;
  name: string;
  order: number;
  style: CompanyRankStyleDto | null;
}

const toCompanyRankDto = (rank: {
  id: string;
  name: string;
  order: number;
  style: CompanyRankStyleDto | null;
}): CompanyRankDto => ({
  id: rank.id,
  name: rank.name,
  order: rank.order,
  style: rank.style
    ? {
        gradientFromColor: rank.style.gradientFromColor,
        gradientFromStop: rank.style.gradientFromStop,
        gradientToColor: rank.style.gradientToColor,
        gradientToStop: rank.style.gradientToStop,
        hasInternalPage: rank.style.hasInternalPage,
        showsPromoVideo: rank.style.showsPromoVideo,
      }
    : null,
});

export interface CompanyDto {
  id: string;
  name: string;
  avatar: string | null;
}

export const toCompanyDto = (company: CompanyDto): CompanyDto => ({
  id: company.id,
  name: company.name,
  avatar: company.avatar,
});

export interface AdminCompanyDto extends CompanyDto {
  website: string | null;
  active: boolean;
  order: number;
  rank: { id: string; name: string };
}

export const toAdminCompanyDto = (
  company: AdminCompanyDto
): AdminCompanyDto => ({
  ...toCompanyDto(company),
  website: company.website,
  active: company.active,
  order: company.order,
  rank: { id: company.rank.id, name: company.rank.name },
});

export interface CompanyRosterDto {
  id: string;
  name: string;
  avatar: string | null;
  website: string | null;
  order: number;
  rank: CompanyRankDto;
  logoWidth: number | null;
  logoHeight: number | null;
  className: string | null;
  interests: string[];
  hasContent: boolean;
}

interface CompanyRosterInput {
  id: string;
  name: string;
  avatar: string | null;
  website: string | null;
  order: number;
  rank: {
    id: string;
    name: string;
    order: number;
    style: CompanyRankStyleDto | null;
  };
  displayStyle: {
    logoWidth: number | null;
    logoHeight: number | null;
    className: string | null;
  } | null;
  interests: { name: TranslationValues }[];
  profile: { id: string } | null;
}

export const toCompanyRosterDto = (
  company: CompanyRosterInput,
  language: Language = Language.PT
): CompanyRosterDto => ({
  id: company.id,
  name: company.name,
  avatar: company.avatar,
  website: company.website,
  order: company.order,
  rank: toCompanyRankDto(company.rank),
  logoWidth: company.displayStyle?.logoWidth ?? null,
  logoHeight: company.displayStyle?.logoHeight ?? null,
  className: company.displayStyle?.className ?? null,
  interests: company.interests.map(({ name }) =>
    Translations.fromJSON(name).get(language)
  ),
  hasContent: company.profile !== null,
});

export interface CompanyProfileDto {
  bodyText: string;
  videoTitle: string | null;
  videoHref: string | null;
  socialLinks: SocialLinks;
  facts: Fact[];
}

export interface CompanyDisplayDto {
  id: string;
  name: string;
  avatar: string | null;
  website: string | null;
  rank: CompanyRankDto;
  profile: CompanyProfileDto | null;
  interests: string[];
}

interface CompanyDisplayInput {
  id: string;
  name: string;
  avatar: string | null;
  website: string | null;
  rank: {
    id: string;
    name: string;
    order: number;
    style: CompanyRankStyleDto | null;
  };
  profile: {
    bodyText: string;
    videoTitle: string | null;
    videoHref: string | null;
    socialLinks: unknown;
    facts: unknown;
  } | null;
  interests: { name: TranslationValues }[];
}

export const toCompanyDisplayDto = (
  company: CompanyDisplayInput,
  language: Language = Language.PT
): CompanyDisplayDto => ({
  id: company.id,
  name: company.name,
  avatar: company.avatar,
  website: company.website,
  rank: toCompanyRankDto(company.rank),
  profile: company.profile
    ? {
        bodyText: company.profile.bodyText,
        videoTitle: company.profile.videoTitle,
        videoHref: company.profile.videoHref,
        socialLinks: parseSocialLinks(company.profile.socialLinks),
        facts: parseFacts(company.profile.facts),
      }
    : null,
  interests: company.interests.map(({ name }) =>
    Translations.fromJSON(name).get(language)
  ),
});
