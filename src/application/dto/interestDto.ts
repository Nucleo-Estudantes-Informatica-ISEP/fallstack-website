export interface InterestDto {
  id: string;
  name: string;
}

export const toInterestDto = (interest: InterestDto): InterestDto => ({
  id: interest.id,
  name: interest.name,
});
