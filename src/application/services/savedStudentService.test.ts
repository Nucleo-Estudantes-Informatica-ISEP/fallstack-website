import { expect, test, vi } from "vitest";

import { isStudentSaved } from "../repositories/savedStudentRepository";
import { getStudentStats } from "./savedStudentService";

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
