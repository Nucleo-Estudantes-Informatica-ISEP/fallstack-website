import { beforeEach, expect, test, vi } from "vitest";

import { actionNames } from "@/edition/actions";

import { countInterestsByIds } from "../repositories/interestRepository";
import {
  createStudent,
  findStudentByCode,
  setStudentInterests,
  updateStudentFields,
  updateStudentMedia,
  updateStudentProfile,
} from "../repositories/studentRepository";
import { withTransaction } from "../repositories/transaction";
import { updateUserActive } from "../repositories/userRepository";
import { completeAction } from "./actionService";
import { deleteUserAccount, setAuthUserBanned } from "./authApplicationService";
import {
  createStudentProfile,
  deleteStudentForAdmin,
  updateStudent,
  updateStudentForAdmin,
} from "./studentService";

const tx = {} as never;

vi.mock("server-only", () => ({}));
vi.mock("../repositories/interestRepository", () => ({
  countInterestsByIds: vi.fn(),
}));
vi.mock("../repositories/savedStudentRepository", () => ({
  isStudentSaved: vi.fn(),
}));
vi.mock("../repositories/studentRepository", () => ({
  connectStudentInterests: vi.fn(),
  createStudent: vi.fn(),
  findStudentByCode: vi.fn(),
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
  vi.mocked(countInterestsByIds).mockImplementation(
    (async (ids: string[]) => ids.length) as never
  );
  vi.mocked(findStudentByCode).mockResolvedValue(null);
  vi.mocked(createStudent).mockResolvedValue({ id: "s1" } as never);
  vi.mocked(updateStudentFields).mockResolvedValue({ id: "s1" } as never);
  vi.mocked(updateStudentProfile).mockResolvedValue({
    id: "s1",
    linkedin: null,
  } as never);
  vi.mocked(withTransaction).mockImplementation((async (
    callback: (db: never) => unknown
  ) => callback(tx)) as never);
});

test("completes the LinkedIn action during signup when a LinkedIn URL is provided", async () => {
  await createStudentProfile("u1", {
    name: "Student",
    year: "3º Ano Licenciatura",
    interests: [],
    linkedin: "https://www.linkedin.com/in/example",
  });

  expect(completeAction).toHaveBeenCalledWith(
    expect.any(String),
    actionNames.updateLinkedin,
    tx
  );
});

test("does not complete the LinkedIn action during signup without a LinkedIn URL", async () => {
  await createStudentProfile("u1", {
    name: "Student",
    year: "3º Ano Licenciatura",
    interests: [],
  });

  expect(completeAction).not.toHaveBeenCalledWith(
    expect.any(String),
    actionNames.updateLinkedin,
    tx
  );
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

test("rejects unknown interest ids with a 400 before opening a transaction", async () => {
  vi.mocked(countInterestsByIds).mockResolvedValue(1);

  await expect(
    updateStudent("s1", "ABC123", { interests: ["interest-1", "gone"] })
  ).rejects.toMatchObject({ status: 400 });

  expect(withTransaction).not.toHaveBeenCalled();
  expect(setStudentInterests).not.toHaveBeenCalled();
});

test("duplicate interest ids count once when validating", async () => {
  await updateStudent("s1", "ABC123", { interests: ["a", "a"] });

  expect(countInterestsByIds).toHaveBeenCalledWith(["a"]);
  expect(setStudentInterests).toHaveBeenCalled();
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
