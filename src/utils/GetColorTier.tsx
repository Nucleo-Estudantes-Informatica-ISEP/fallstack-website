export type CompaniesTier = "diamond" | "gold" | "silver" | "bronze";

export const getTierStyling = (tier: CompaniesTier): string => {
  switch (tier) {
    case "diamond":
      return `text-transparent bg-clip-text bg-gradient-to-r from-[#000999] from-13% to-[#3284FF] to-89%`;
    case "gold":
      return `text-transparent bg-clip-text bg-gradient-to-r from-[#FF9D00] from-13% to-[#8E8900] to-89%`;
    case "silver":
      return `text-transparent bg-clip-text bg-gradient-to-r from-[#484848] from-13% to-[#FFFFFF] to-89%`;
    case "bronze":
      return `text-transparent bg-clip-text bg-gradient-to-r from-[#692100] from-13% to-[#E98800] to-89%`;
    default:
      throw new Error("Tier not found");
  }
};
