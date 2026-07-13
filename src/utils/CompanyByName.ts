import { CompanyProps } from "@/components/Companies/Company";
import { COMPANY_TIER, CompanyTier } from "@/domain/Company/company-tier";

import { DiamondCompanies } from "./DiamondCompanies";
import { GoldCompanies } from "./GoldCompanies";
import { SilverCompanies } from "./SilverCompanies";

interface CompanyDetails {
  props: CompanyProps;
  tier: CompanyTier;
}

export default function findCompanyByName(name: string): CompanyDetails | null {
  name = name.replaceAll("%20", " ");
  const nameLower = name.toLowerCase();

  for (const company of DiamondCompanies) {
    if (company.name.toLowerCase() === nameLower) {
      return { props: company, tier: COMPANY_TIER.DIAMOND };
    }
  }

  for (const company of GoldCompanies) {
    if (company.name.toLowerCase() === nameLower) {
      return { props: company, tier: COMPANY_TIER.GOLD };
    }
  }

  for (const company of SilverCompanies) {
    if (company.name.toLowerCase() === nameLower) {
      return { props: company, tier: COMPANY_TIER.SILVER };
    }
  }

  return null;
}
