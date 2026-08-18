import { beforeEach, expect, test, vi } from "vitest";

import {
  updateStudentFields,
  updateStudentMedia,
} from "../repositories/studentRepository";
import { updateUserActive } from "../repositories/userRepository";
import { deleteUserAccount, setAuthUserBanned } from "./authApplicationService";
import { deleteStudentForAdmin, updateStudentForAdmin } from "./studentService";

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("../repositories/savedStudentRepository", () => ({
  isStudentSaved: vi.fn(),
}));
vi.mock("../repositories/studentRepository", () => ({
  updateStudentFields: vi.fn(),
  updateStudentMedia: vi.fn(),
}));
vi.mock("../repositories/userRepository", () => ({
  updateUserActive: vi.fn(),
  deleteUser: vi.fn(),
  setUserInterests: vi.fn(),
  connectUserInterests: vi.fn(),
  upsertUser: vi.fn(),
}));
vi.mock("./actionService", () => ({ completeAction: vi.fn() }));
vi.mock("./authApplicationService", () => ({
  createSupabaseAuthUserAsAdmin: vi.fn(),
  deleteUserAccount: vi.fn(),
  rollbackAuthUser: vi.fn(),
  setAuthUserBanned: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateStudentFields).mockResolvedValue({ id: "s1" } as never);
});

test("deactivating a student updates the DB flag and bans the Supabase auth user", async () => {
  await updateStudentForAdmin("s1", { active: false });

  expect(updateUserActive).toHaveBeenCalledWith("s1", false);
  expect(setAuthUserBanned).toHaveBeenCalledWith("s1", true);
});

test("reactivating a student clears the DB flag and unbans the Supabase auth user", async () => {
  await updateStudentForAdmin("s1", { active: true });

  expect(updateUserActive).toHaveBeenCalledWith("s1", true);
  expect(setAuthUserBanned).toHaveBeenCalledWith("s1", false);
});

test("leaves active status untouched when not part of the update", async () => {
  await updateStudentForAdmin("s1", { name: "New Name" });

  expect(updateUserActive).not.toHaveBeenCalled();
  expect(setAuthUserBanned).not.toHaveBeenCalled();
  expect(updateStudentMedia).not.toHaveBeenCalled();
});

test("deletes the student account through the shared auth-aware service", async () => {
  await deleteStudentForAdmin("s1");

  expect(deleteUserAccount).toHaveBeenCalledWith("s1");
});
