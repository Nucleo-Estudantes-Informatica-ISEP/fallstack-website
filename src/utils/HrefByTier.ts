import { CompaniesTier } from "@/utils/GetColorTier";

export default function hrefByCompanyTier(
  tier: CompaniesTier,
  name: string,
  websiteUrl: string | undefined
): string {
  switch (tier) {
    case "diamond":
      return `/company/${name}`;
    case "gold":
      return `/company/${name}`;
    case "silver":
      return websiteUrl || "/";
    default:
      throw new Error("Tier not found");
  }
}
