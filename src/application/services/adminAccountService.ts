import "server-only";

import type { AdminRole } from "@prisma/client";

import { Email } from "@/types/Email";
import { HttpError } from "@/types/HttpError";

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
  // This only allocates the local application UUID. Real global admin access
  // is granted in NEI Global/ZITADEL and becomes authoritative at login.
  const appIdentity = await createSupabaseAuthUserAsAdmin(
    input.email,
    input.password,
    input.name
  );
  try {
    return await createAdminUser({
      id: appIdentity.id,
      email: input.email,
      name: input.name,
      adminRole: input.adminRole,
    });
  } catch (error) {
    await rollbackAuthUser(appIdentity.id);
    throw error;
  }
}

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
  const { password: _password, active, ...fields } = input;
  if (fields.adminRole === "ADMIN" || active === false)
    await assertNotLastActiveSuperAdmin(await findAdminAccountById(id));

  const admin = await updateAdminUserFields(id, fields);
  if (active !== undefined) await updateUserActive(id, active);
  return admin;
}

export async function deleteAdminAccount(id: string) {
  await assertNotLastActiveSuperAdmin(await findAdminAccountById(id));
  await deleteUserAccount(id);
}
