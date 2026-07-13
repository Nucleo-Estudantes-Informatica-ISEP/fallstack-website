export function rankInterestMatchingCompanies<
  TCompany,
  TInterest extends { id: string },
>(
  companies: (TCompany & { user: { interests: TInterest[] } })[],
  userInterests: { id: string }[],
  limit = 3
) {
  const userInterestIds = new Set(userInterests.map(({ id }) => id));
  return companies
    .map((company) => ({
      company,
      matchingInterests: company.user.interests.filter(({ id }) =>
        userInterestIds.has(id)
      ),
    }))
    .sort((a, b) => b.matchingInterests.length - a.matchingInterests.length)
    .slice(0, limit);
}
