import "server-only";

import { setCompanyInterests } from "../repositories/companyRepository";
import { setStudentInterests } from "../repositories/studentRepository";

export async function updateUserInterests(input: {
  userId: string;
  companyId?: string;
  interests: string[];
}) {
  if (input.companyId) {
    await setCompanyInterests(input.companyId, input.interests);
  } else {
    await setStudentInterests(input.userId, input.interests);
  }

  return { success: true };
}
