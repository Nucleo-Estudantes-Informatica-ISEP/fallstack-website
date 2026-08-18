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

export function parseSocialLinks(value: unknown): SocialLinks {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const links: SocialLinks = {};
  for (const key of SOCIAL_LINK_KEYS) {
    const link = record[key];
    if (typeof link === "string" && link) links[key] = link;
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
