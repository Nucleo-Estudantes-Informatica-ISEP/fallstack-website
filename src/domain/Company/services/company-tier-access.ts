import { CompanyTier, COMPANY_TIER } from "@/domain/Company/company-tier";

// Business rule: which tiers get an internal company page vs. redirect
// to their own external website. This is domain logic, not UI.
const TIER_USES_INTERNAL_PAGE: Record<CompanyTier, boolean> = {
  [COMPANY_TIER.DIAMOND]: true,
  [COMPANY_TIER.GOLD]: true,
  [COMPANY_TIER.SILVER]: false,
  [COMPANY_TIER.BRONZE]: false,
};

export function hrefByCompanyTier(
  tier: CompanyTier,
  name: string,
  websiteUrl: string | undefined
): string {
  return TIER_USES_INTERNAL_PAGE[tier]
    ? `/company/${encodeURIComponent(name)}`
    : websiteUrl || "/";
}