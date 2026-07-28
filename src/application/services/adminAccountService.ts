import "server-only";

import type { AdminRole } from "@prisma/client";

import { Email } from "@/types/Email";
import { HttpError } from "@/types/HttpError";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  countAdminsForAdmin,
  createAdminUser,
  findAdminAccountById,
  findAdminsForAdmin,
  updateAdminUserFields,
  type AdminAccountQuery,
} from "../repositories/adminRepository";
import { deleteUser, updateUserActive } from "../repositories/userRepository";
import {
  createSupabaseAuthUserAsAdmin,
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
  email: string;
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
      email: Email.create(input.email),
      name: input.name,
      adminRole: input.adminRole,
    });
  } catch (error) {
    await rollbackAuthUser(authUser.id);
    throw error;
  }
}

// Prevents a super admin from locking every admin out (including
// themselves) by deactivating or deleting their own account through this
// same panel - a demotion is still allowed, since that's recoverable by any
// other super admin (or the DB directly), unlike losing all admin access.
function assertNotActingOnSelf(id: string, actingAdminId: string) {
  if (id === actingAdminId)
    throw new HttpError(
      "You can't deactivate or delete your own admin account",
      400
    );
}

export async function updateAdminAccount(
  id: string,
  actingAdminId: string,
  input: {
    name?: string;
    adminRole?: AdminRole;
    password?: string;
    active?: boolean;
  }
) {
  const { password, active, ...fields } = input;
  if (active === false) assertNotActingOnSelf(id, actingAdminId);

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

export async function deleteAdminAccount(id: string, actingAdminId: string) {
  assertNotActingOnSelf(id, actingAdminId);
  await deleteUser(id);
}
