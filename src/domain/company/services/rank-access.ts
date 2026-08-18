// Business rule: which ranks get an internal company page vs. redirect to
// their own external website - now CompanyRankStyle.hasInternalPage data
// instead of a hardcoded Record<CompanyTier, boolean>. This is domain
// logic, not UI.
export function companyProfileHref(
  hasInternalPage: boolean,
  name: string,
  websiteUrl: string | undefined,
  hasContent: boolean
): string {
  // The internal page 404s without profile content (see
  // company/[name]/page.tsx), so a rank with hasInternalPage but no
  // CompanyProfile falls back to linking out like any other rank.
  return hasInternalPage && hasContent
    ? `/company/${encodeURIComponent(name)}`
    : websiteUrl || "/";
}
