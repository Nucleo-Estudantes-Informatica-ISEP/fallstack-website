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

export interface AdminCompanyDto extends CompanyDto {
  website: string | null;
  active: boolean;
  order: number;
}

export const toAdminCompanyDto = (
  company: AdminCompanyDto
): AdminCompanyDto => ({
  ...toCompanyDto(company),
  website: company.website,
  active: company.active,
  order: company.order,
});

export interface CompanyRosterDto {
  id: string;
  name: string;
  tier: "DIAMOND" | "GOLD" | "SILVER" | "BRONZE";
  avatar: string | null;
  website: string | null;
  order: number;
}

export const toCompanyRosterDto = (
  company: CompanyRosterDto
): CompanyRosterDto => ({
  id: company.id,
  name: company.name,
  tier: company.tier,
  avatar: company.avatar,
  website: company.website,
  order: company.order,
});
