export interface StudentAccess {
  studentCode?: string;
  companyId?: string;
  isAdmin: boolean;
  /**
   * Set when the caller already knows the saved-by-company result (e.g. it
   * just queried it for another purpose), so the lookup below can be skipped
   * instead of re-deriving the same answer with another DB round-trip.
   */
  isSaved?: boolean;
}

export async function isAllowedToViewStudent(
  code: string,
  access: StudentAccess,
  lookupIsSaved: (companyId: string, code: string) => Promise<boolean>
) {
  return (
    access.studentCode === code ||
    access.isAdmin ||
    (!!access.companyId &&
      (access.isSaved ?? (await lookupIsSaved(access.companyId, code))))
  );
}
