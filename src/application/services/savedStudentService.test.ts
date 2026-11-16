import { beforeEach, expect, test, vi } from "vitest";

import {
  createSavedStudent,
  isStudentSaved,
} from "../repositories/savedStudentRepository";
import { findStudentByCode } from "../repositories/studentRepository";
import { withTransaction } from "../repositories/transaction";
import { completeCompanyBoothAction } from "./actionService";
import { getStudentStats, saveStudent } from "./savedStudentService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/companyRepository", () => ({
  findCompanyById: vi.fn(),
  findCompanyEmployee: vi.fn(),
}));
vi.mock("../repositories/savedStudentRepository", () => ({
  countCompanySaves: vi.fn(),
  countStudentSaves: vi.fn().mockResolvedValue(3),
  countStudentSavesSince: vi.fn(),
  createSavedStudent: vi.fn(),
  findAdminScans: vi.fn(),
  findCompanyHistory: vi.fn(),
  findCompanyHistoryWithInterests: vi.fn(),
  findCompanySavedStudentsWithCv: vi.fn(),
  findCompanySavesForExport: vi.fn(),
  findStudentHistory: vi.fn(),
  isStudentSaved: vi.fn(),
  isUniqueConstraintError: vi.fn(),
  updateSavedStudentComment: vi.fn(),
}));
vi.mock("../repositories/studentRepository", () => ({
  findStudentByCode: vi.fn(),
  findStudentByEmail: vi.fn(),
}));
vi.mock("../repositories/transaction", () => ({
  withTransaction: vi.fn(),
}));
vi.mock("./actionService", () => ({ completeCompanyBoothAction: vi.fn() }));

test("a student can query their own stats", async () => {
  await expect(
    getStudentStats("student-1", { studentCode: "student-1", isAdmin: false })
  ).resolves.toEqual({ totalScans: 3, totalSaves: 3 });
});

test("a student cannot query an unrelated student's stats", async () => {
  vi.mocked(isStudentSaved).mockResolvedValue(false);

  await expect(
    getStudentStats("student-2", {
      studentCode: "student-1",
      companyId: "company-1",
      isAdmin: false,
    })
  ).rejects.toMatchObject({ message: "Not found", status: 404 });
  expect(isStudentSaved).toHaveBeenCalledWith("company-1", "student-2");
});

test("an admin can query any student's stats", async () => {
  await expect(
    getStudentStats("student-2", { isAdmin: true })
  ).resolves.toEqual({ totalScans: 3, totalSaves: 3 });
});

test("a company that saved the student can query their stats", async () => {
  vi.mocked(isStudentSaved).mockResolvedValue(true);

  await expect(
    getStudentStats("student-2", {
      companyId: "company-1",
      isAdmin: false,
    })
  ).resolves.toEqual({ totalScans: 3, totalSaves: 3 });
  expect(isStudentSaved).toHaveBeenCalledWith("company-1", "student-2");
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findStudentByCode).mockResolvedValue({
    id: "student-id",
    code: "ABC123",
  } as never);
  vi.mocked(isStudentSaved).mockResolvedValue(false);
  vi.mocked(withTransaction).mockImplementation(async (work) =>
    work({} as never)
  );
});

test.each([false, true])(
  "rejects self-scans before saving or awarding points (allowDuplicate=%s)",
  async (allowDuplicate) => {
    await expect(
      saveStudent({
        studentCode: "ABC123",
        employeeId: "student-id",
        actorId: "student-id",
        companyId: "company-id",
        allowDuplicate,
        completeBoothAction: true,
      })
    ).rejects.toMatchObject({
      status: 403,
      message: "You cannot scan your own QR code",
    });
    expect(isStudentSaved).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
    expect(createSavedStudent).not.toHaveBeenCalled();
    expect(completeCompanyBoothAction).not.toHaveBeenCalled();
  }
);

test("uses the caller rather than the attributed employee for admin saves", async () => {
  await expect(
    saveStudent({
      studentCode: "ABC123",
      employeeId: "other-employee",
      actorId: "student-id",
      companyId: "company-id",
    })
  ).rejects.toMatchObject({ status: 403 });
});

test("allows scanning another student and completing the booth action", async () => {
  await saveStudent({
    studentCode: "ABC123",
    actorId: "employee-id",
    employeeId: "employee-id",
    companyId: "company-id",
    completeBoothAction: true,
  });
  expect(createSavedStudent).toHaveBeenCalledWith(
    "student-id",
    "employee-id",
    "company-id",
    {},
    undefined
  );
  expect(completeCompanyBoothAction).toHaveBeenCalledWith(
    "ABC123",
    "company-id",
    {}
  );
});
