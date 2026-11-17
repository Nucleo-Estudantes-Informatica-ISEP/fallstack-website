import { beforeEach, expect, test, vi } from "vitest";

import { HttpError } from "@/types/HttpError";
import { actionNames } from "@/edition/actions";

import { consumeCvUpload } from "../repositories/cvUploadRepository";
import { countInterestsByIds } from "../repositories/interestRepository";
import {
  createStudent,
  findStudentByCode,
  setStudentInterests,
  updateStudentCv,
  updateStudentFields,
  updateStudentMedia,
  updateStudentProfile,
} from "../repositories/studentRepository";
import { withTransaction } from "../repositories/transaction";
import { setUserRole, updateUserActive } from "../repositories/userRepository";
import { completeAction } from "./actionService";
import { deleteUserAccount, setAuthUserBanned } from "./authApplicationService";
import {
  createStudentProfile,
  deleteStudentForAdmin,
  setStudentCv,
  updateStudent,
  updateStudentForAdmin,
} from "./studentService";

const tx = {} as never;

vi.mock("server-only", () => ({}));
vi.mock("../repositories/cvUploadRepository", () => ({
  consumeCvUpload: vi.fn(),
}));
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
  updateStudentCv: vi.fn(),
  updateStudentFields: vi.fn(),
  updateStudentMedia: vi.fn(),
  updateStudentProfile: vi.fn(),
}));
vi.mock("../repositories/transaction", () => ({ withTransaction: vi.fn() }));
vi.mock("../repositories/userRepository", () => ({
  updateUserActive: vi.fn(),
  setUserRole: vi.fn(),
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
    institutionalEmail: "1234567@isep.ipp.pt",
    course: "Engenharia Informática",
    privacyPolicyAccepted: true,
    termsAccepted: true,
    privacyPolicyVersion: "2026-10-31",
    termsVersion: "2026-11-11",
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
    institutionalEmail: "1234567@isep.ipp.pt",
    course: "Engenharia Informática",
    privacyPolicyAccepted: true,
    termsAccepted: true,
    privacyPolicyVersion: "2026-10-31",
    termsVersion: "2026-11-11",
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

test("signup persists consent versions and a server-generated acceptance time", async () => {
  const before = Date.now();
  await createStudentProfile("u1", {
    name: "Student",
    institutionalEmail: "1234567@isep.ipp.pt",
    year: "3º Ano Licenciatura",
    course: "Engenharia Informática",
    interests: [],
    privacyPolicyAccepted: true,
    termsAccepted: true,
    privacyPolicyVersion: "2026-10-31",
    termsVersion: "2026-11-11",
  });
  const input = vi.mocked(createStudent).mock.calls[0][0];
  expect(input).toMatchObject({
    course: "Engenharia Informática",
    privacyPolicyAccepted: true,
    termsAccepted: true,
    privacyPolicyVersion: "2026-10-31",
    termsVersion: "2026-11-11",
    consentAcceptedAt: expect.any(Date),
  });
  expect(input.consentAcceptedAt!.getTime()).toBeGreaterThanOrEqual(before);
  expect(input.consentAcceptedAt!.getTime()).toBeLessThanOrEqual(Date.now());
});

test("createStudentProfile consumes CV upload and marks action complete when cvId is provided", async () => {
  vi.mocked(consumeCvUpload).mockResolvedValue(true);
  await createStudentProfile("u1", {
    name: "Student",
    institutionalEmail: "1234567@isep.ipp.pt",
    year: "3º Ano Licenciatura",
    course: "Engenharia Informática",
    interests: [],
    privacyPolicyAccepted: true,
    termsAccepted: true,
    privacyPolicyVersion: "2026-10-31",
    termsVersion: "2026-11-11",
    cvId: "cv-uuid-1",
  });

  expect(consumeCvUpload).toHaveBeenCalledWith("u1", "cv-uuid-1", tx);
  expect(completeAction).toHaveBeenCalledWith(
    expect.any(String),
    actionNames.uploadCv,
    tx
  );
  expect(updateStudentMedia).toHaveBeenCalledWith(
    "s1",
    { avatar: null, cv: "cv-uuid-1" },
    tx
  );
});

test("createStudentProfile rolls back transaction when createStudent fails", async () => {
  vi.mocked(createStudent).mockRejectedValueOnce(
    new Error("DB constraint violation")
  );
  await expect(
    createStudentProfile("u1", {
      name: "Student",
      institutionalEmail: "1234567@isep.ipp.pt",
      year: "3º Ano Licenciatura",
      course: "Engenharia Informática",
      interests: [],
      privacyPolicyAccepted: true,
      termsAccepted: true,
      privacyPolicyVersion: "2026-10-31",
      termsVersion: "2026-11-11",
      cvId: "cv-uuid-1",
    })
  ).rejects.toThrow("DB constraint violation");

  expect(consumeCvUpload).toHaveBeenCalledWith("u1", "cv-uuid-1", tx);
  expect(updateStudentMedia).not.toHaveBeenCalled();
});

test("setStudentCv returns early without transaction if student already has this CV", async () => {
  vi.mocked(findStudentByCode).mockResolvedValueOnce({
    id: "s1",
    code: "ABC123",
    cv: "existing-cv-id",
  } as never);

  await setStudentCv("ABC123", "existing-cv-id");

  expect(withTransaction).not.toHaveBeenCalled();
  expect(consumeCvUpload).not.toHaveBeenCalled();
});

test("setStudentCv propagates 409 when consumeCvUpload throws superseded error", async () => {
  vi.mocked(findStudentByCode).mockResolvedValueOnce({
    id: "s1",
    code: "ABC123",
    cv: "older-cv-id",
  } as never);
  vi.mocked(consumeCvUpload).mockRejectedValueOnce(
    new HttpError("CV upload superseded", 409)
  );

  await expect(setStudentCv("ABC123", "candidate-cv-id")).rejects.toMatchObject(
    {
      status: 409,
      message: "CV upload superseded",
    }
  );

  expect(updateStudentCv).not.toHaveBeenCalled();
  expect(completeAction).not.toHaveBeenCalled();
});

test("setStudentCv updates student CV and completes action when consumeCvUpload attaches", async () => {
  vi.mocked(findStudentByCode).mockResolvedValueOnce({
    id: "s1",
    code: "ABC123",
    cv: null,
  } as never);
  vi.mocked(consumeCvUpload).mockResolvedValueOnce(true);

  await setStudentCv("ABC123", "new-cv-id");

  expect(consumeCvUpload).toHaveBeenCalledWith("s1", "new-cv-id", tx);
  expect(updateStudentCv).toHaveBeenCalledWith("ABC123", "new-cv-id", tx);
  expect(completeAction).toHaveBeenCalledWith(
    "ABC123",
    actionNames.uploadCv,
    tx
  );
});

test("onboarding assigns the student role and contact in the profile transaction", async () => {
  await createStudentProfile("admin-id", {
    name: "Admin Student",
    institutionalEmail: "1234567@isep.ipp.pt",
    course: "LEI",
    year: "1º Ano Licenciatura",
    interests: [],
    privacyPolicyAccepted: true,
    termsAccepted: true,
    privacyPolicyVersion: "2026-10-31",
    termsVersion: "2026-11-11",
  });
  expect(setUserRole).toHaveBeenCalledWith("admin-id", "STUDENT", tx);
  expect(createStudent).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "admin-id",
      institutionalEmail: "1234567@isep.ipp.pt",
    }),
    tx
  );
});
