export const COMPANY_TIER = {
  DIAMOND: "DIAMOND",
  GOLD: "GOLD",
  SILVER: "SILVER",
  BRONZE: "BRONZE",
} as const;

const TIER_VALUES = [
  COMPANY_TIER.DIAMOND,
  COMPANY_TIER.GOLD,
  COMPANY_TIER.SILVER,
  COMPANY_TIER.BRONZE,
] as const;
export type CompanyTier = (typeof TIER_VALUES)[number];

export function parseCompanyTier(value: string): CompanyTier {
  const normalized = value.trim().toUpperCase();

  if (!TIER_VALUES.includes(normalized as CompanyTier)) {
    throw new Error(`Invalid company tier: "${value}".`);
  }

  return normalized as CompanyTier;
}
