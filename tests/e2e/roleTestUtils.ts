import { request, type APIRequestContext } from "@playwright/test";

import { e2eEnv } from "./env";

export type AuthenticatedRole = "student" | "employee" | "admin" | "superAdmin";

const storageStateByRole: Record<AuthenticatedRole, string | undefined> = {
  student: e2eEnv.storageState,
  employee: e2eEnv.employeeStorageState,
  admin: e2eEnv.adminStorageState,
  superAdmin: e2eEnv.superAdminStorageState,
};

export const hasRoleStates = (...roles: AuthenticatedRole[]) =>
  roles.every((role) => Boolean(storageStateByRole[role]));

export async function createRoleContext(
  role?: AuthenticatedRole
): Promise<APIRequestContext> {
  if (!e2eEnv.baseUrl) throw new Error("E2E_BASE_URL is required");
  const storageState = role ? storageStateByRole[role] : undefined;
  if (role && !storageState)
    throw new Error(`Storage state for ${role} is required`);
  return request.newContext({ baseURL: e2eEnv.baseUrl, storageState });
}
