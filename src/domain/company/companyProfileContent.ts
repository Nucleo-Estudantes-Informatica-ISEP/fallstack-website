import { safeHttpsLink } from "@/domain/outboundLink";

import { FactIconName, isFactIconName } from "./factIcons";

// CompanyProfile.socialLinks/facts are stored as JSON (see schema.prisma) -
// these narrow the untyped JSON back into a safe shape for rendering,
// silently dropping anything malformed rather than throwing, since a bad
// row shouldn't 500 the company page - see #280.

export interface SocialLinks {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
}

const SOCIAL_LINK_KEYS = [
  "twitter",
  "facebook",
  "instagram",
  "youtube",
  "linkedin",
] as const;

const socialHosts: Record<keyof SocialLinks, RegExp> = {
  twitter: /^(?:(?:www|mobile)\.)?(?:twitter\.com|x\.com)$/,
  facebook: /^(?:(?:www|m|[a-z]{2}-[a-z]{2})\.)?(?:facebook\.com|fb\.com)$/,
  instagram: /^(?:www\.)?instagram\.com$/,
  youtube: /^(?:(?:www|m)\.)?(?:youtube\.com|youtu\.be)$/,
  linkedin: /^(?:(?:www|[a-z]{2})\.)?linkedin\.com$/,
};

export function safeCompanySocialLink(key: keyof SocialLinks, value: string) {
  return safeHttpsLink(value, socialHosts[key]);
}

export function readSocialLinks(value: unknown): SocialLinks {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const links: SocialLinks = {};
  for (const key of SOCIAL_LINK_KEYS) {
    const link = record[key];
    if (typeof link !== "string") continue;
    links[key] = link;
  }
  return links;
}

export function parseSocialLinks(value: unknown): SocialLinks {
  const links = readSocialLinks(value);
  for (const key of SOCIAL_LINK_KEYS) {
    const link = links[key];
    const valid = link && safeCompanySocialLink(key, link);
    if (valid) links[key] = valid;
    else delete links[key];
  }
  return links;
}

export interface Fact {
  iconName: FactIconName;
  description: string;
  className?: string;
}

export function parseFacts(value: unknown): Fact[] {
  if (!Array.isArray(value)) return [];
  const facts: Fact[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { iconName, description, className } = entry as Record<
      string,
      unknown
    >;
    if (typeof iconName !== "string" || !isFactIconName(iconName)) continue;
    if (typeof description !== "string" || !description) continue;
    facts.push({
      iconName,
      description,
      ...(typeof className === "string" ? { className } : {}),
    });
  }
  return facts;
}
