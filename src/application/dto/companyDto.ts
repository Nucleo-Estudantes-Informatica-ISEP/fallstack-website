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

export interface InterestMatchDto {
  company: CompanyDto;
  matchingInterests: InterestDto[];
}

interface InterestDto {
  id: string;
  name: string;
}

export const toInterestMatchDto = (
  match: InterestMatchDto
): InterestMatchDto => ({
  company: toCompanyDto(match.company),
  matchingInterests: match.matchingInterests.map(({ id, name }) => ({
    id,
    name,
  })),
});
