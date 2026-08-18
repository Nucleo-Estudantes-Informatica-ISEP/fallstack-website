import { beforeEach, expect, test, vi } from "vitest";

import { Email } from "@/types/Email";

import {
  countActiveSuperAdmins,
  createAdminUser,
  findAdminAccountById,
  updateAdminUserFields,
} from "../repositories/adminRepository";
import { updateUserActive } from "../repositories/userRepository";
import {
  createAdminAccount,
  deleteAdminAccount,
  getAdminAccountById,
  updateAdminAccount,
} from "./adminAccountService";
import {
  createSupabaseAuthUserAsAdmin,
  deleteUserAccount,
  rollbackAuthUser,
  setAuthUserBanned,
} from "./authApplicationService";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("../repositories/adminRepository", () => ({
  countActiveSuperAdmins: vi.fn(),
  createAdminUser: vi.fn(),
  findAdminAccountById: vi.fn(),
  findAdminsForAdmin: vi.fn(),
  countAdminsForAdmin: vi.fn(),
  updateAdminUserFields: vi.fn(),
}));
vi.mock("../repositories/userRepository", () => ({
  updateUserActive: vi.fn(),
}));
vi.mock("./authApplicationService", () => ({
  createSupabaseAuthUserAsAdmin: vi.fn(),
  deleteUserAccount: vi.fn(),
  rollbackAuthUser: vi.fn(),
  setAuthUserBanned: vi.fn(),
}));

const superAdminTarget = { adminRole: "SUPER_ADMIN", active: true } as never;
const regularAdminTarget = { adminRole: "ADMIN", active: true } as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateAdminUserFields).mockResolvedValue({ id: "a1" } as never);
  vi.mocked(findAdminAccountById).mockResolvedValue(regularAdminTarget);
  vi.mocked(countActiveSuperAdmins).mockResolvedValue(2);
});

test("creating an admin rolls back the local placeholder if the DB write fails", async () => {
  vi.mocked(createSupabaseAuthUserAsAdmin).mockResolvedValue({
    id: "new-admin-id",
  } as never);
  vi.mocked(createAdminUser).mockRejectedValue(new Error("db down"));

  await expect(
    createAdminAccount({
      email: Email.create("admin@isep.ipp.pt"),
      password: "password123",
      name: "New Admin",
      adminRole: "ADMIN",
    })
  ).rejects.toThrow("db down");

  expect(rollbackAuthUser).toHaveBeenCalledWith("new-admin-id");
});

test("creating an admin provisions only the local application row", async () => {
  vi.mocked(createSupabaseAuthUserAsAdmin).mockResolvedValue({
    id: "new-admin-id",
  } as never);
  vi.mocked(createAdminUser).mockResolvedValue({ id: "new-admin-id" } as never);

  await createAdminAccount({
    email: Email.create("admin@isep.ipp.pt"),
    password: "password123",
    name: "New Admin",
    adminRole: "SUPER_ADMIN",
  });

  expect(createSupabaseAuthUserAsAdmin).toHaveBeenCalledWith(
    "admin@isep.ipp.pt",
    "password123",
    "New Admin"
  );
  expect(createAdminUser).toHaveBeenCalledWith({
    id: "new-admin-id",
    email: Email.create("admin@isep.ipp.pt"),
    name: "New Admin",
    adminRole: "SUPER_ADMIN",
  });
});

test("can't deactivate the last active super admin", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue(superAdminTarget);
  vi.mocked(countActiveSuperAdmins).mockResolvedValue(1);

  await expect(updateAdminAccount("a1", { active: false })).rejects.toThrow(
    "last active Super Admin"
  );

  expect(updateUserActive).not.toHaveBeenCalled();
  expect(setAuthUserBanned).not.toHaveBeenCalled();
});

test("can deactivate a super admin locally when another active one remains", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue(superAdminTarget);
  vi.mocked(countActiveSuperAdmins).mockResolvedValue(2);

  await updateAdminAccount("a1", { active: false });

  expect(updateUserActive).toHaveBeenCalledWith("a1", false);
  expect(setAuthUserBanned).not.toHaveBeenCalled();
});

test("can't demote the last active super admin", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue(superAdminTarget);
  vi.mocked(countActiveSuperAdmins).mockResolvedValue(1);

  await expect(
    updateAdminAccount("a1", { adminRole: "ADMIN" })
  ).rejects.toThrow("last active Super Admin");

  expect(updateAdminUserFields).not.toHaveBeenCalled();
});

test("can demote a super admin when another active one remains (including themselves)", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue(superAdminTarget);
  vi.mocked(countActiveSuperAdmins).mockResolvedValue(2);

  await updateAdminAccount("a1", { adminRole: "ADMIN" });

  expect(updateAdminUserFields).toHaveBeenCalledWith("a1", {
    adminRole: "ADMIN",
  });
});

test("deactivating/renaming a regular admin never checks the super admin count", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue(regularAdminTarget);

  await updateAdminAccount("a2", { active: false, name: "New Name" });

  expect(countActiveSuperAdmins).not.toHaveBeenCalled();
  expect(updateUserActive).toHaveBeenCalledWith("a2", false);
  expect(setAuthUserBanned).not.toHaveBeenCalled();
});

test("an already-inactive super admin doesn't block further action on their row", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue({
    adminRole: "SUPER_ADMIN",
    active: false,
  } as never);

  await expect(deleteAdminAccount("a1")).resolves.toBeUndefined();

  expect(countActiveSuperAdmins).not.toHaveBeenCalled();
  expect(deleteUserAccount).toHaveBeenCalledWith("a1");
});

test("can't delete the last active super admin", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue(superAdminTarget);
  vi.mocked(countActiveSuperAdmins).mockResolvedValue(1);

  await expect(deleteAdminAccount("a1")).rejects.toThrow(
    "last active Super Admin"
  );
  expect(deleteUserAccount).not.toHaveBeenCalled();
});

test("can delete a regular admin's account freely", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue(regularAdminTarget);

  await deleteAdminAccount("a2");

  expect(countActiveSuperAdmins).not.toHaveBeenCalled();
  expect(deleteUserAccount).toHaveBeenCalledWith("a2");
});

test("getAdminAccountById is a thin passthrough to the repository", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue({ id: "a1" } as never);

  await expect(getAdminAccountById("a1")).resolves.toEqual({ id: "a1" });
  expect(findAdminAccountById).toHaveBeenCalledWith("a1");
});
