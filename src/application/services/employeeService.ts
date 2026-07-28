import "server-only";

import { Email } from "@/types/Email";
import { HttpError } from "@/types/HttpError";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  createEmployee,
  findCompanyById,
} from "../repositories/companyRepository";
import {
  countEmployeesForAdmin,
  findEmployeeProfileById,
  findEmployeesForAdmin,
  updateEmployeeFields,
  type AdminEmployeeQuery,
} from "../repositories/employeeRepository";
import { withTransaction } from "../repositories/transaction";
import {
  deleteUser,
  updateUserActive,
  upsertUser,
} from "../repositories/userRepository";
import {
  createSupabaseAuthUserAsAdmin,
  rollbackAuthUser,
  setAuthUserBanned,
} from "./authApplicationService";

export const getEmployeeById = (id: string) => findEmployeeProfileById(id);

export async function listEmployeesForAdmin(query: AdminEmployeeQuery) {
  const [items, totalCount] = await Promise.all([
    findEmployeesForAdmin(query),
    countEmployeesForAdmin(query.search),
  ]);
  return { items, totalCount };
}

export async function createEmployeeForAdmin(input: {
  email: string;
  password: string;
  name: string;
  companyId: string;
  linkedin?: string;
}) {
  if (!(await findCompanyById(input.companyId)))
    throw new HttpError("Invalid company", 404);

  const authUser = await createSupabaseAuthUserAsAdmin(
    input.email,
    input.password
  );
  try {
    return await withTransaction(async (tx) => {
      await upsertUser(
        { id: authUser.id, email: Email.create(input.email), role: "EMPLOYEE" },
        tx
      );
      return createEmployee(
        {
          id: authUser.id,
          name: input.name,
          linkedin: input.linkedin,
          companyId: input.companyId,
        },
        tx
      );
    });
  } catch (error) {
    await rollbackAuthUser(authUser.id);
    throw error;
  }
}

export async function updateEmployeeForAdmin(
  id: string,
  input: {
    name?: string;
    linkedin?: string | null;
    companyId?: string;
    password?: string;
    active?: boolean;
  }
) {
  const { password, active, ...profile } = input;
  const employee = await updateEmployeeFields(id, profile);
  if (active !== undefined) {
    await updateUserActive(id, active);
    await setAuthUserBanned(id, !active);
  }
  if (password) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) throw new HttpError(error.message, 400);
  }
  return employee;
}

export const deleteEmployeeForAdmin = (id: string) => deleteUser(id);
