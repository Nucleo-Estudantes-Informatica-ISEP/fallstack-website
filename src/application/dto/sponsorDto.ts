export interface SponsorDto {
  id: string;
  name: string;
  logo: string;
  website: string | null;
  order: number;
}

export const toSponsorDto = (sponsor: SponsorDto): SponsorDto => ({
  id: sponsor.id,
  name: sponsor.name,
  logo: sponsor.logo,
  website: sponsor.website,
  order: sponsor.order,
});

export interface AdminSponsorDto extends SponsorDto {
  active: boolean;
}

export const toAdminSponsorDto = (
  sponsor: AdminSponsorDto
): AdminSponsorDto => ({
  ...toSponsorDto(sponsor),
  active: sponsor.active,
});
