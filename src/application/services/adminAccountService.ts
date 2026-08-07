import "server-only";

import type { AdminRole } from "@prisma/client";

import { Email } from "@/types/Email";
import { HttpError } from "@/types/HttpError";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  countActiveSuperAdmins,
  countAdminsForAdmin,
  createAdminUser,
  findAdminAccountById,
  findAdminsForAdmin,
  updateAdminUserFields,
  type AdminAccountQuery,
} from "../repositories/adminRepository";
import { updateUserActive } from "../repositories/userRepository";
import {
  createSupabaseAuthUserAsAdmin,
  deleteUserAccount,
  rollbackAuthUser,
  setAuthUserBanned,
} from "./authApplicationService";

export const getAdminAccountById = (id: string) => findAdminAccountById(id);

export async function listAdminsForAdmin(query: AdminAccountQuery) {
  const [items, totalCount] = await Promise.all([
    findAdminsForAdmin(query),
    countAdminsForAdmin(query.search),
  ]);
  return { items, totalCount };
}

export async function createAdminAccount(input: {
  email: Email;
  password: string;
  name: string;
  adminRole: AdminRole;
}) {
  const authUser = await createSupabaseAuthUserAsAdmin(
    input.email,
    input.password,
    input.name
  );
  try {
    return await createAdminUser({
      id: authUser.id,
      email: input.email,
      name: input.name,
      adminRole: input.adminRole,
    });
  } catch (error) {
    await rollbackAuthUser(authUser.id);
    throw error;
  }
}

// Guards demote/deactivate/delete against leaving zero *active* Super
// Admins, however that would happen - not just self-action. The migration
// that introduced admin tiers promotes nobody to SUPER_ADMIN automatically
// and seedAdmin() only ever creates one, so a lone super admin demoting
// themselves (no guard existed for this case at all) or deactivating/
// deleting themselves would make /admins permanently unreachable (gated by
// both the page-level check and the "superadmin" auth policy) with no UI
// path back - only a direct DB write could recover it. An inactive super
// admin doesn't count as available either, since they can't log in to help.
async function assertNotLastActiveSuperAdmin(
  target: { adminRole: AdminRole | null; active: boolean } | null
) {
  if (!target || target.adminRole !== "SUPER_ADMIN" || !target.active) return;
  if ((await countActiveSuperAdmins()) <= 1)
    throw new HttpError(
      "Can't remove the last active Super Admin - promote another admin first",
      400
    );
}

export async function updateAdminAccount(
  id: string,
  input: {
    name?: string;
    adminRole?: AdminRole;
    password?: string;
    active?: boolean;
  }
) {
  const { password, active, ...fields } = input;
  if (fields.adminRole === "ADMIN" || active === false)
    await assertNotLastActiveSuperAdmin(await findAdminAccountById(id));

  const admin = await updateAdminUserFields(id, fields);

  if (active !== undefined) {
    await updateUserActive(id, active);
    await setAuthUserBanned(id, !active);
  }
  if (password) {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password,
    });
    if (error) throw new HttpError(error.message, 400);
  }
  return admin;
}

export async function deleteAdminAccount(id: string) {
  await assertNotLastActiveSuperAdmin(await findAdminAccountById(id));
  await deleteUserAccount(id);
}
