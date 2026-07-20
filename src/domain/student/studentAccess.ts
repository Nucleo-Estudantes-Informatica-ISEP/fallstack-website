export interface StudentAccess {
  studentCode?: string;
  companyId?: string;
  isAdmin: boolean;
}

export async function isAllowedToViewStudent(
  code: string,
  access: StudentAccess,
  isSaved: (companyId: string, code: string) => Promise<boolean>
) {
  return (
    access.studentCode === code ||
    access.isAdmin ||
    (!!access.companyId && (await isSaved(access.companyId, code)))
  );
}
