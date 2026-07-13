import "server-only";

import { withTransaction } from "../repositories/transaction";
import {
  findEmployeeUserIds,
  setUserInterests,
} from "../repositories/userRepository";

export async function updateUserInterests(input: {
  userId: string;
  companyId?: string;
  interests: string[];
}) {
  if (!input.companyId) {
    await setUserInterests(input.userId, input.interests);
  } else {
    const ids = await findEmployeeUserIds(input.companyId);
    await withTransaction(async (tx) =>
      Promise.all(ids.map((id) => setUserInterests(id, input.interests, tx)))
    );
  }
  return { success: true };
}
