import "server-only";

import { createHash, randomUUID } from "crypto";

import { Email } from "@/types/Email";
import { HttpError } from "@/types/HttpError";
import { reportError } from "@/lib/logger";

import { createEmployee } from "../repositories/companyRepository";
import { findCompanyByInviteCodeHash } from "../repositories/companyInviteRepository";
import { withTransaction } from "../repositories/transaction";
import {
  deleteUser,
  findUserByEmail,
  findUserSessionByZitadelUserId,
  provisionZitadelUser,
  setUserRole,
} from "../repositories/userRepository";
import {
  assignEmployeeRole,
  signAppSession,
  type ZitadelIdentity,
} from "./zitadelAuthService";

export class AuthAccountDeletionError extends HttpError {}

export async function deleteUserAccount(userId: string) {
  await deleteUser(userId);
}

// User.active is the Fallstack-specific deactivation gate. ZITADEL identities
// are shared across NEI apps, so Fallstack must never globally ban the person.
export async function setAuthUserBanned(_userId: string, _banned: boolean) {
  return;
}

// Compatibility shim for existing admin CRUD: it now allocates only a local
// application UUID. Authentication/passwords are owned exclusively by
// AuthNEI; the row is linked by verified email on the person's first login.
export async function createSupabaseAuthUserAsAdmin(
  _email: string,
  _password: string,
  _displayName?: string
) {
  return { id: randomUUID() };
}

export async function rollbackAuthUser(_userId: string) {
  // No external identity was created, so there is nothing to roll back.
}

export async function completeZitadelSignIn(input: {
  identity: ZitadelIdentity;
  fallback: string;
}) {
  const user = await provisionZitadelUser({
    zitadelUserId: input.identity.sub,
    email: Email.create(input.identity.email),
    name: input.identity.name,
    isEmployee: input.identity.isEmployee,
    isGlobalAdmin: input.identity.isGlobalAdmin,
  });

  if (input.fallback !== "/") return input.fallback;
  if (input.identity.isGlobalAdmin) return "/overview";
  if (user.role === "EMPLOYEE" && user.employee) return "/dashboard";
  if (user.role === "EMPLOYEE") return "/login?modal=employee";
  if (user.student) return `/student/${user.student.code}`;
  return "/signup?authnei=1";
}

function inviteCodeHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function signUpEmployee(input: {
  userId: string;
  zitadelUserId: string;
  email: Email;
  name: string;
  linkedin?: string;
  companyCode: string;
}) {
  const company = await findCompanyByInviteCodeHash(
    inviteCodeHash(input.companyCode)
  );
  if (!company) throw new HttpError("Invalid company code", 404);

  const existing = await findUserSessionByZitadelUserId(input.zitadelUserId);
  if (!existing || existing.id !== input.userId)
    throw new HttpError("Unable to resolve AuthNEI account", 401);
  if (existing.employee) throw new HttpError("Employee profile already exists", 409);

  await assignEmployeeRole(input.zitadelUserId);

  try {
    await withTransaction(async (tx) => {
      await setUserRole(input.userId, "EMPLOYEE", tx);
      await createEmployee(
        {
          id: input.userId,
          name: input.name,
          linkedin: input.linkedin,
          companyId: company.id,
        },
        tx
      );
    });
  } catch (error) {
    reportError(
      error,
      { operation: "create_employee_profile" },
      "Failed to create employee profile"
    );
    throw new HttpError("Unable to create employee profile", 500);
  }

  return signAppSession({
    sub: input.zitadelUserId,
    email: input.email,
    name: input.name,
    emailVerified: true,
    isEmployee: true,
    isGlobalAdmin: false,
  });
}

export async function changePassword(input: {
  email: Email;
  password: string;
  confirmPassword: string;
}) {
  const user = await findUserByEmail(input.email);
  if (!user) throw new HttpError("That email is not registered", 401);
  if (input.password !== input.confirmPassword)
    throw new HttpError("Passwords are not equal", 400);

  throw new HttpError(
    "Passwords are managed by AuthNEI. Use the AuthNEI account recovery flow.",
    410
  );
}
