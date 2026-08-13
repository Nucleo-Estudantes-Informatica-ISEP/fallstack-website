export interface AdminCompanyRankDto {
  id: string;
  name: string;
  order: number;
  style: {
    gradientFromColor: string;
    gradientFromStop: string;
    gradientToColor: string;
    gradientToStop: string;
    hasInternalPage: boolean;
    showsPromoVideo: boolean;
  } | null;
}

export const toAdminCompanyRankDto = (
  rank: AdminCompanyRankDto
): AdminCompanyRankDto => ({
  id: rank.id,
  name: rank.name,
  order: rank.order,
  style: rank.style
    ? {
        gradientFromColor: rank.style.gradientFromColor,
        gradientFromStop: rank.style.gradientFromStop,
        gradientToColor: rank.style.gradientToColor,
        gradientToStop: rank.style.gradientToStop,
        hasInternalPage: rank.style.hasInternalPage,
        showsPromoVideo: rank.style.showsPromoVideo,
      }
    : null,
});
