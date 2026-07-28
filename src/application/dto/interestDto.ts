export interface InterestDto {
  id: string;
  name: string;
}

export const toInterestDto = (interest: InterestDto): InterestDto => ({
  id: interest.id,
  name: interest.name,
});

export interface AdminInterestDto extends InterestDto {
  usersCount: number;
}

export const toAdminInterestDto = (interest: {
  id: string;
  name: string;
  _count: { users: number };
}): AdminInterestDto => ({
  id: interest.id,
  name: interest.name,
  usersCount: interest._count.users,
});
