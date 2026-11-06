import { beforeEach, expect, test, vi } from "vitest";

import {
  setStudentInterests,
  updateStudentFields,
  updateStudentMedia,
  updateStudentProfile,
} from "../repositories/studentRepository";
import { withTransaction } from "../repositories/transaction";
import { updateUserActive } from "../repositories/userRepository";
import { deleteUserAccount, setAuthUserBanned } from "./authApplicationService";
import {
  deleteStudentForAdmin,
  updateStudent,
  updateStudentForAdmin,
} from "./studentService";

const tx = {} as never;

vi.mock("server-only", () => ({}));
vi.mock("../repositories/savedStudentRepository", () => ({
  isStudentSaved: vi.fn(),
}));
vi.mock("../repositories/studentRepository", () => ({
  setStudentInterests: vi.fn(),
  updateStudentFields: vi.fn(),
  updateStudentMedia: vi.fn(),
  updateStudentProfile: vi.fn(),
}));
vi.mock("../repositories/transaction", () => ({ withTransaction: vi.fn() }));
vi.mock("../repositories/userRepository", () => ({
  updateUserActive: vi.fn(),
  deleteUser: vi.fn(),
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
  vi.mocked(updateStudentProfile).mockResolvedValue({
    id: "s1",
    linkedin: null,
  } as never);
  vi.mocked(withTransaction).mockImplementation((async (
    callback: (db: never) => unknown
  ) => callback(tx)) as never);
});

test("saving a profile forwards only the profile fields and sets interests separately", async () => {
  await updateStudent("s1", "ABC123", {
    bio: "Hello",
    interests: ["interest-1", "interest-2"],
  });

  expect(updateStudentProfile).toHaveBeenCalledWith(
    "ABC123",
    { bio: "Hello" },
    tx
  );
  expect(setStudentInterests).toHaveBeenCalledWith(
    "s1",
    ["interest-1", "interest-2"],
    tx
  );
});

test("leaves interests untouched when the profile update does not include them", async () => {
  await updateStudent("s1", "ABC123", { bio: "Hello" });

  expect(updateStudentProfile).toHaveBeenCalledWith(
    "ABC123",
    { bio: "Hello" },
    tx
  );
  expect(setStudentInterests).not.toHaveBeenCalled();
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
