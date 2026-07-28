import { beforeEach, expect, test, vi } from "vitest";

import { Email } from "@/types/Email";

import {
  createAdminUser,
  findAdminAccountById,
  updateAdminUserFields,
} from "../repositories/adminRepository";
import { deleteUser, updateUserActive } from "../repositories/userRepository";
import {
  createAdminAccount,
  deleteAdminAccount,
  updateAdminAccount,
} from "./adminAccountService";
import {
  createSupabaseAuthUserAsAdmin,
  rollbackAuthUser,
  setAuthUserBanned,
} from "./authApplicationService";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("../repositories/adminRepository", () => ({
  createAdminUser: vi.fn(),
  findAdminAccountById: vi.fn(),
  findAdminsForAdmin: vi.fn(),
  countAdminsForAdmin: vi.fn(),
  updateAdminUserFields: vi.fn(),
}));
vi.mock("../repositories/userRepository", () => ({
  updateUserActive: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock("./authApplicationService", () => ({
  createSupabaseAuthUserAsAdmin: vi.fn(),
  rollbackAuthUser: vi.fn(),
  setAuthUserBanned: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateAdminUserFields).mockResolvedValue({ id: "a1" } as never);
});

test("creating an admin rolls back the Supabase auth user if the DB write fails", async () => {
  vi.mocked(createSupabaseAuthUserAsAdmin).mockResolvedValue({
    id: "new-admin-id",
  } as never);
  vi.mocked(createAdminUser).mockRejectedValue(new Error("db down"));

  await expect(
    createAdminAccount({
      email: "admin@isep.ipp.pt",
      password: "password123",
      name: "New Admin",
      adminRole: "ADMIN",
    })
  ).rejects.toThrow("db down");

  expect(rollbackAuthUser).toHaveBeenCalledWith("new-admin-id");
});

test("creating an admin passes the display name through to Supabase and the DB row", async () => {
  vi.mocked(createSupabaseAuthUserAsAdmin).mockResolvedValue({
    id: "new-admin-id",
  } as never);
  vi.mocked(createAdminUser).mockResolvedValue({ id: "new-admin-id" } as never);

  await createAdminAccount({
    email: "admin@isep.ipp.pt",
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

test("a super admin can't deactivate their own account", async () => {
  await expect(
    updateAdminAccount("a1", "a1", { active: false })
  ).rejects.toThrow("own admin account");

  expect(updateUserActive).not.toHaveBeenCalled();
  expect(setAuthUserBanned).not.toHaveBeenCalled();
});

test("a super admin can deactivate a different admin's account", async () => {
  await updateAdminAccount("a2", "a1", { active: false });

  expect(updateUserActive).toHaveBeenCalledWith("a2", false);
  expect(setAuthUserBanned).toHaveBeenCalledWith("a2", true);
});

test("a super admin can demote themselves (only deactivation/deletion is blocked)", async () => {
  await expect(
    updateAdminAccount("a1", "a1", { adminRole: "ADMIN" })
  ).resolves.toBeDefined();

  expect(updateAdminUserFields).toHaveBeenCalledWith("a1", {
    adminRole: "ADMIN",
  });
});

test("a super admin can't delete their own account", async () => {
  await expect(deleteAdminAccount("a1", "a1")).rejects.toThrow(
    "own admin account"
  );
  expect(deleteUser).not.toHaveBeenCalled();
});

test("a super admin can delete a different admin's account", async () => {
  await deleteAdminAccount("a2", "a1");
  expect(deleteUser).toHaveBeenCalledWith("a2");
});

test("getAdminAccountById is a thin passthrough to the repository", async () => {
  vi.mocked(findAdminAccountById).mockResolvedValue({ id: "a1" } as never);
  const { getAdminAccountById } = await import("./adminAccountService");

  await expect(getAdminAccountById("a1")).resolves.toEqual({ id: "a1" });
  expect(findAdminAccountById).toHaveBeenCalledWith("a1");
});
