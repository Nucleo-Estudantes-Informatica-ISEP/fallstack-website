import "server-only";

import { setCompanyInterestsByName } from "../repositories/companyRepository";
import { setStudentInterests } from "../repositories/userRepository";

export async function updateUserInterests(input: {
  userId: string;
  companyId?: string;
  interests: string[];
}) {
  if (input.companyId) {
    await setCompanyInterestsByName(input.companyId, input.interests);
  } else {
    await setStudentInterests(input.userId, input.interests);
  }

  return { success: true };
}
