import { beforeEach, expect, test, vi } from "vitest";

import { updateEmployeeFields } from "../repositories/employeeRepository";
import { updateUserActive } from "../repositories/userRepository";
import { deleteUserAccount, setAuthUserBanned } from "./authApplicationService";
import {
  deleteEmployeeForAdmin,
  updateEmployeeForAdmin,
} from "./employeeService";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("../repositories/companyRepository", () => ({
  createEmployee: vi.fn(),
  findCompanyById: vi.fn(),
}));
vi.mock("../repositories/employeeRepository", () => ({
  updateEmployeeFields: vi.fn(),
  findEmployeeProfileById: vi.fn(),
  findEmployeesForAdmin: vi.fn(),
  countEmployeesForAdmin: vi.fn(),
}));
vi.mock("../repositories/transaction", () => ({
  withTransaction: vi.fn(),
}));
vi.mock("../repositories/userRepository", () => ({
  updateUserActive: vi.fn(),
  deleteUser: vi.fn(),
  upsertUser: vi.fn(),
}));
vi.mock("./authApplicationService", () => ({
  createSupabaseAuthUserAsAdmin: vi.fn(),
  deleteUserAccount: vi.fn(),
  rollbackAuthUser: vi.fn(),
  setAuthUserBanned: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateEmployeeFields).mockResolvedValue({ id: "e1" } as never);
});

test("deactivating an employee updates the DB flag and bans the Supabase auth user", async () => {
  await updateEmployeeForAdmin("e1", { active: false });

  expect(updateUserActive).toHaveBeenCalledWith("e1", false);
  expect(setAuthUserBanned).toHaveBeenCalledWith("e1", true);
});

test("reactivating an employee clears the DB flag and unbans the Supabase auth user", async () => {
  await updateEmployeeForAdmin("e1", { active: true });

  expect(updateUserActive).toHaveBeenCalledWith("e1", true);
  expect(setAuthUserBanned).toHaveBeenCalledWith("e1", false);
});

test("leaves active status untouched when not part of the update", async () => {
  await updateEmployeeForAdmin("e1", { name: "New Name" });

  expect(updateUserActive).not.toHaveBeenCalled();
  expect(setAuthUserBanned).not.toHaveBeenCalled();
});

test("deletes the employee account through the shared auth-aware service", async () => {
  await deleteEmployeeForAdmin("e1");

  expect(deleteUserAccount).toHaveBeenCalledWith("e1");
});
