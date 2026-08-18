import "server-only";

import { Email } from "@/types/Email";
import { HttpError } from "@/types/HttpError";
import { reportError } from "@/lib/logger";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

import {
  createEmployee,
  findCompanyByCode,
} from "../repositories/companyRepository";
import { withTransaction } from "../repositories/transaction";
import {
  deleteUser,
  deleteUserIfExists,
  findUserByEmail,
  findUserSessionByEmail,
  findUserSessionById,
  relinkUserId,
  upsertUser,
} from "../repositories/userRepository";

// Self-hosted GoTrue occasionally returns an error body with none of the
// msg/message/error/error_description fields supabase-js looks for (e.g. an
// infra-level failure upstream of GoTrue itself); its client then falls back
// to JSON.stringify()-ing the (often empty) body, producing an opaque "{}"
// that isn't useful to show a user. Fall back to a fixed message instead of
// letting that leak through to the UI.
function usableAuthErrorMessage(message: string | undefined, fallback: string) {
  const trimmed = message?.trim();
  if (!trimmed || trimmed.startsWith("{")) return fallback;
  return trimmed;
}

async function createSupabaseAuthUser(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user)
    throw new HttpError(
      usableAuthErrorMessage(error?.message, "Unable to sign up"),
      400
    );
  if (!data.session)
    await supabase.auth.signInWithPassword({ email, password });
  return data.user;
}

// Used when an admin creates a Student/Employee account on someone else's
// behalf: sets the password directly and skips email confirmation, unlike
// the self-service createSupabaseAuthUser() above (which signs the caller
// themselves in). Students already have a self-service password-reset flow
// for later changes; this is only for initial provisioning.
export async function createSupabaseAuthUserAsAdmin(
  email: string,
  password: string,
  displayName?: string
) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: displayName ? { name: displayName } : undefined,
  });
  if (error || !data.user)
    throw new HttpError(
      usableAuthErrorMessage(error?.message, "Unable to create account"),
      400
    );
  return data.user;
}

export async function rollbackAuthUser(userId: string) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error)
      reportError(
        error,
        { operation: "rollback_admin_created_auth_user" },
        "Failed to roll back admin-created auth user"
      );
  } catch (error) {
    reportError(
      error,
      { operation: "rollback_admin_created_auth_user" },
      "Failed to roll back admin-created auth user"
    );
  }
}

// Thrown only when the Supabase Auth deletion call itself failed - i.e.
// neither the Auth identity nor the app row has been touched yet. Callers
// that catch a deleteUserAccount() failure must check for this specifically:
// it's the one case where falling back to an app-only delete would create an
// Auth-only orphan. Extends HttpError so existing `instanceof HttpError`
// error-response mapping in every other caller keeps working unchanged.
export class AuthAccountDeletionError extends HttpError {}

// Supabase Auth and public.User cannot share a foreign key. Delete Auth first
// so an Auth API failure cannot remove the app row and leave a login identity
// that the backoffice can no longer retry deleting.
export async function deleteUserAccount(userId: string) {
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  // Only an explicit code proves absence. Missing codes can also mean the
  // malformed self-hosted GoTrue failures described above, so stay fail-closed.
  if (error && error.code !== "user_not_found")
    throw new AuthAccountDeletionError(
      usableAuthErrorMessage(error?.message, "Unable to delete account"),
      500
    );
  await deleteUser(userId);
}

// Defense-in-depth alongside User.active, which is what getServerSession()
// actually enforces on every request - this additionally stops the person
// from obtaining a *new* Supabase session at all once deactivated. Best-
// effort: a failure here is reported but doesn't block the admin action,
// since the DB-side active flag (the real enforcement point) already took
// effect regardless.
export async function setAuthUserBanned(userId: string, banned: boolean) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      // Supabase has no "ban forever" option - a 100-year duration is its
      // documented way to express an effectively permanent ban.
      ban_duration: banned ? "876000h" : "none",
    });
    if (error)
      reportError(
        error,
        { operation: "set_auth_user_banned" },
        "Failed to update Supabase Auth ban status"
      );
  } catch (error) {
    reportError(
      error,
      { operation: "set_auth_user_banned" },
      "Failed to update Supabase Auth ban status"
    );
  }
}

type SessionUser = NonNullable<Awaited<ReturnType<typeof findUserSessionById>>>;

function destinationFor(user: SessionUser, fallback: string) {
  if (user.role === "STUDENT" && user.student)
    return `/student/${user.student.code}`;
  if (user.role === "EMPLOYEE" && user.employee) return "/dashboard";
  // STUDENT role but no profile yet — still needs the signup wizard.
  return fallback;
}

// Students no longer have a self-service email/password signup route in
// this app (account creation is AuthNEI-only - see AccountDetailsStep), but
// Supabase's own auth.signUp() REST endpoint is still directly reachable
// with the public anon key regardless of what this app's UI offers, so
// anyone can still plant an unconfirmed User row under a real student's
// ISEP email. Only a *confirmed* identity actually proves the signer
// received and clicked a confirmation link sent to that mailbox, so
// completeOAuthSignIn() below must not trust an email match blindly: an
// unconfirmed row is treated as a dangling/spoofed placeholder, not a real
// account to relink onto. This still depends on "Confirm email" being ON in
// the Supabase project - see the AuthNEI PR's manual-steps checklist.
async function isEmailConfirmed(id: string) {
  const { data, error } = await createAdminClient().auth.admin.getUserById(id);
  if (error || !data.user) {
    const lookupError = error ?? new Error("Existing identity not found");
    reportError(
      lookupError,
      { operation: "authnei_check_email_confirmed" },
      "Failed to look up existing identity's confirmation status"
    );
    throw new HttpError("Unable to verify existing account", 500);
  }
  return Boolean(data.user.email_confirmed_at);
}

// Called from the AuthNEI OAuth callback once Supabase has already
// exchanged the code for a session — Supabase manages the auth identity
// itself, so unlike signUpEmployee() there is no password to set here.
// Returns where the browser should land next.
export async function completeOAuthSignIn(input: {
  id: string;
  email: Email;
  fallback: string;
}) {
  const existing = await findUserSessionById(input.id);
  if (existing) return destinationFor(existing, input.fallback);

  // No User row for this Supabase auth id yet. If one already exists under
  // this email - e.g. a student who signed up earlier with a password,
  // confirmed their account, and is now trying AuthNEI for the first time -
  // Supabase won't have auto-linked it (it only auto-links dangling
  // *unconfirmed* identities), so AuthNEI issued a distinct auth id for the
  // same person. Re-key the existing row onto the new id instead of
  // creating a duplicate, which would violate the email unique constraint.
  const existingByEmail = await findUserSessionByEmail(input.email);
  if (existingByEmail) {
    if (await isEmailConfirmed(existingByEmail.id)) {
      await relinkUserId(existingByEmail.id, input.id);
      return destinationFor(existingByEmail, input.fallback);
    }

    // Unconfirmed - discard the dangling placeholder instead of relinking
    // onto it, so AuthNEI (institutionally-verified) can claim the email
    // fresh below rather than inheriting potentially attacker-planted data.
    try {
      await deleteUserAccount(existingByEmail.id);
    } catch (error) {
      if (error instanceof AuthAccountDeletionError) {
        // The Auth deletion call itself failed - neither the Auth identity
        // nor the app row has been touched, so deleting only the app row
        // here would create an Auth-only orphan. Leave both sides intact
        // and let this sign-in attempt fail; the OAuth callback route
        // catches this and redirects to /auth/auth-code-error, so the user
        // just retries once Auth is reachable again.
        reportError(
          error,
          { operation: "delete_unconfirmed_account_placeholder" },
          "Failed to delete unconfirmed account placeholder's Auth identity"
        );
        throw error;
      }

      // Auth was already confirmed deleted or absent (deleteUserAccount only
      // reaches this point after that) - e.g. a raced concurrent OAuth
      // callback deleted the app row first. No orphan risk: finish the
      // cleanup and continue provisioning.
      reportError(
        error,
        { operation: "delete_unconfirmed_account_placeholder" },
        "Failed to fully delete unconfirmed account placeholder"
      );
      await deleteUserIfExists(existingByEmail.id);
    }
  }

  // First AuthNEI sign-in for this identity, no (trustworthy) pre-existing
  // account either. AuthNEI only proves identity — it's wired up for
  // students only for now, so provision the app-level user here and send
  // them into the signup wizard to finish their profile (year, bio,
  // interests).
  await upsertUser({ id: input.id, email: input.email, role: "STUDENT" });
  return input.fallback;
}

export async function signUpEmployee(input: {
  email: Email;
  password: string;
  name: string;
  linkedin?: string;
  companyCode: string;
}) {
  const company = await findCompanyByCode(input.companyCode);
  if (!company) throw new HttpError("Invalid company code", 404);
  const user = await createSupabaseAuthUser(input.email, input.password);
  try {
    await withTransaction(async (tx) => {
      await upsertUser(
        { id: user.id, email: input.email, role: "EMPLOYEE" },
        tx
      );
      await createEmployee(
        {
          id: user.id,
          name: input.name,
          linkedin: input.linkedin,
          companyId: company.id,
        },
        tx
      );
    });
  } catch (error) {
    try {
      const admin = createAdminClient();
      const { error: cleanupError } = await admin.auth.admin.deleteUser(
        user.id
      );
      if (cleanupError)
        reportError(
          cleanupError,
          { operation: "rollback_employee_auth_signup" },
          "Failed to roll back employee auth signup"
        );
    } catch (cleanupError) {
      reportError(
        cleanupError,
        { operation: "rollback_employee_auth_signup" },
        "Failed to roll back employee auth signup"
      );
    }
    reportError(
      error,
      { operation: "create_employee_profile" },
      "Failed to create employee profile"
    );
    throw new HttpError("Unable to create employee profile", 500);
  }
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
  const { error } = await createAdminClient().auth.admin.updateUserById(
    user.id,
    {
      password: input.password,
    }
  );
  if (error) throw new HttpError(error.message, 400);
}
