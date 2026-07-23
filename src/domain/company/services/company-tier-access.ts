import { COMPANY_TIER, CompanyTier } from "@/domain/company/company-tier";

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
  websiteUrl: string | undefined,
  hasContent: boolean
): string {
  // The internal page 404s without edition content (see company/[name]/page.tsx),
  // so a DIAMOND/GOLD company with none falls back to linking out like SILVER/BRONZE.
  return TIER_USES_INTERNAL_PAGE[tier] && hasContent
    ? `/company/${encodeURIComponent(name)}`
    : websiteUrl || "/";
}
