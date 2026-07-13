import "server-only";

import {
  findEmployeeUserIds,
  setUserInterests,
} from "../repositories/userRepository";

export async function updateUserInterests(input: {
  userId: string;
  companyId?: string;
  interests: string[];
}) {
  if (!input.companyId) return setUserInterests(input.userId, input.interests);
  const ids = await findEmployeeUserIds(input.companyId);
  await Promise.all(ids.map((id) => setUserInterests(id, input.interests)));
  return { success: true };
}
