import "server-only";

import { HttpError } from "@/types/HttpError";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

import {
  createEmployee,
  findCompanyByCode,
} from "../repositories/companyRepository";
import { createUser, findUserByEmail } from "../repositories/userRepository";

export async function signUpUser(input: {
  email: string;
  password: string;
  role: "STUDENT" | "EMPLOYEE";
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (error || !data.user)
    throw new HttpError(error?.message || "Unable to sign up", 400);
  if (!data.session)
    await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
  try {
    await createUser({
      id: data.user.id,
      email: input.email,
      role: input.role,
    });
  } catch {
    // Existing application user is valid for idempotent signup retries.
  }
  return data.user;
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
  const user = await signUpUser({
    email: input.email,
    password: input.password,
    role: "EMPLOYEE",
  });
  await createEmployee({
    id: user.id,
    name: input.name,
    linkedin: input.linkedin,
    companyId: company.id,
  });
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
