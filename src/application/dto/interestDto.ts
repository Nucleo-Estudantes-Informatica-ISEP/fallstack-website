export interface InterestDto {
  id: string;
  name: string;
}

export const toInterestDto = (interest: InterestDto): InterestDto => ({
  id: interest.id,
  name: interest.name,
});

export type AdminInterestDto = InterestDto;

export const toAdminInterestDto = (
  interest: InterestDto
): AdminInterestDto => ({
  id: interest.id,
  name: interest.name,
});
