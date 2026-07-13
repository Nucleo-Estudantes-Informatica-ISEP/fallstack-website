import "server-only";

import { HttpError } from "@/types/HttpError";
import { reportError } from "@/lib/logger";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

import {
  createEmployee,
  findCompanyByCode,
} from "../repositories/companyRepository";
import { withTransaction } from "../repositories/transaction";
import { findUserByEmail, upsertUser } from "../repositories/userRepository";

async function createSupabaseAuthUser(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user)
    throw new HttpError(error?.message || "Unable to sign up", 400);
  if (!data.session)
    await supabase.auth.signInWithPassword({ email, password });
  return data.user;
}

export async function signUpUser(input: {
  email: string;
  password: string;
  role: "STUDENT" | "EMPLOYEE";
}) {
  const user = await createSupabaseAuthUser(input.email, input.password);
  await upsertUser({ id: user.id, email: input.email, role: input.role });
  return user;
}

export async function signUpEmployee(input: {
  email: string;
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
  email: string;
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
