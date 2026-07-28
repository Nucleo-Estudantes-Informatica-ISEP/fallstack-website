import { COMPANY_TIER, CompanyTier } from "@/domain/company/company-tier";

const TIER_STYLING: Record<CompanyTier, string> = {
  [COMPANY_TIER.DIAMOND]: `text-transparent bg-clip-text bg-gradient-to-r from-[#000999] from-13% to-[#3284FF] to-89%`,
  [COMPANY_TIER.GOLD]: `text-transparent bg-clip-text bg-gradient-to-r from-[#FF9D00] from-13% to-[#8E8900] to-89%`,
  [COMPANY_TIER.SILVER]: `text-transparent bg-clip-text bg-gradient-to-r from-[#484848] from-13% to-[#FFFFFF] to-89%`,
  [COMPANY_TIER.BRONZE]: `text-transparent bg-clip-text bg-gradient-to-r from-[#692100] from-13% to-[#E98800] to-89%`,
};

const DISPLAY_LABELS: Record<CompanyTier, string> = {
  [COMPANY_TIER.DIAMOND]: "Diamond",
  [COMPANY_TIER.GOLD]: "Gold",
  [COMPANY_TIER.SILVER]: "Silver",
  [COMPANY_TIER.BRONZE]: "Bronze",
};

export function getTierStyling(tier: CompanyTier): string {
  return TIER_STYLING[tier];
}

export function tierDisplayLabel(tier: CompanyTier): string {
  return DISPLAY_LABELS[tier];
}
