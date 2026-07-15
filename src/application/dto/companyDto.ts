export interface CompanyDto {
  id: string;
  name: string;
  tier: "DIAMOND" | "GOLD" | "SILVER" | "BRONZE";
  avatar: string | null;
}

export const toCompanyDto = (company: CompanyDto): CompanyDto => ({
  id: company.id,
  name: company.name,
  tier: company.tier,
  avatar: company.avatar,
});
