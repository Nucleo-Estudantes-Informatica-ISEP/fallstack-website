import "server-only";

import { Email } from "@/types/Email";
import { HttpError } from "@/types/HttpError";

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
import { updateUserActive, upsertUser } from "../repositories/userRepository";
import {
  createSupabaseAuthUserAsAdmin,
  deleteUserAccount,
  rollbackAuthUser,
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

  // Creates only the application placeholder UUID. The employee establishes
  // their AuthNEI identity themselves and is linked by verified email.
  const appIdentity = await createSupabaseAuthUserAsAdmin(
    input.email,
    input.password
  );
  try {
    return await withTransaction(async (tx) => {
      await upsertUser(
        {
          id: appIdentity.id,
          email: Email.create(input.email),
          role: "EMPLOYEE",
        },
        tx
      );
      return createEmployee(
        {
          id: appIdentity.id,
          name: input.name,
          linkedin: input.linkedin,
          companyId: input.companyId,
        },
        tx
      );
    });
  } catch (error) {
    await rollbackAuthUser(appIdentity.id);
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
  const { password: _password, active, ...profile } = input;
  const employee = await updateEmployeeFields(id, profile);
  if (active !== undefined) await updateUserActive(id, active);
  return employee;
}

export const deleteEmployeeForAdmin = (id: string) => deleteUserAccount(id);
