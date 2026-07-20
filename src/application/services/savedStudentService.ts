import "server-only";

import { Email } from "@/types/Email";
import { HttpError } from "@/types/HttpError";
import type { Stats } from "@/types/Stats";
import { getBoothActionName } from "@/edition/actions";
import { ISEP_EMAIL_DOMAIN } from "@/utils/isepEmail";

import { assertStudentCanBeSaved } from "../domain/saveRules";
import {
  isAllowedToViewStudent,
  type StudentAccess,
} from "../domain/studentAccess";
import {
  findCompanyById,
  findCompanyEmployee,
  findCompanyName,
} from "../repositories/companyRepository";
import {
  countCompanySaves,
  countStudentSaves,
  countStudentSavesSince,
  createSavedStudent,
  findAdminScans,
  findCompanyHistory,
  findCompanyHistoryWithInterests,
  findCompanySavedStudentsWithCv,
  findCompanySavesForExport,
  findStudentHistory,
  isStudentSaved,
  isUniqueConstraintError,
  updateSavedStudentComment as updateSavedStudentCommentRecord,
} from "../repositories/savedStudentRepository";
import {
  findStudentByCode,
  findStudentByEmail,
} from "../repositories/studentRepository";
import { withTransaction } from "../repositories/transaction";
import { completeAction } from "./actionService";

export async function saveStudent(input: {
  studentCode: string;
  employeeId: string;
  companyId: string;
  comment?: string | null;
  allowDuplicate?: boolean;
  completeBoothAction?: boolean;
}) {
  const student = await findStudentByCode(input.studentCode);
  if (!student) throw new HttpError("Student not found", 404);
  assertStudentCanBeSaved(
    await isStudentSaved(input.companyId, student.code),
    input.allowDuplicate
  );
  try {
    return await withTransaction(async (tx) => {
      const saved = await createSavedStudent(
        student.id,
        input.employeeId,
        input.companyId,
        tx,
        input.comment
      );
      if (input.completeBoothAction) {
        const company = await findCompanyName(input.companyId, tx);
        if (!company) throw new HttpError("Company not found", 404);
        const action = getBoothActionName(company.name);
        if (action) await completeAction(student.code, action, tx);
      }
      return saved;
    });
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw new HttpError("Student already saved", 400);
    throw error;
  }
}

export async function updateSavedStudentComment(
  studentId: string,
  companyId: string,
  comment: string | null
) {
  const updated = await updateSavedStudentCommentRecord(
    studentId,
    companyId,
    comment
  );
  if (!updated.count) throw new HttpError("Saved student not found", 404);
}

export async function saveStudentAsAdmin(
  emailOrNumber: string,
  companyId: string
) {
  let email: Email;
  try {
    email = Email.createInDomain(emailOrNumber, ISEP_EMAIL_DOMAIN);
  } catch {
    throw new HttpError("Invalid student email or number", 400);
  }
  const student = await findStudentByEmail(email);
  if (!student) throw new HttpError("Student not found", 404);
  const company = await findCompanyById(companyId);
  if (!company) throw new HttpError("Company not found", 404);
  const employee = await findCompanyEmployee(companyId);
  if (!employee)
    throw new HttpError("Company has no employees to attribute save to", 400);
  return saveStudent({
    studentCode: student.code,
    employeeId: employee.id,
    companyId,
  });
}

export const isSaved = (companyId: string, code: string) =>
  isStudentSaved(companyId, code);

export async function getStudentStats(
  code: string,
  access: StudentAccess
): Promise<Stats> {
  if (!(await isAllowedToViewStudent(code, access, isStudentSaved)))
    throw new HttpError("Not found", 404);
  const count = await countStudentSaves(code);
  return { totalScans: count, totalSaves: count };
}

export const getTodayStudentStats = (studentId: string) => {
  const now = new Date();
  return countStudentSavesSince(
    studentId,
    new Date(now.getFullYear(), now.getMonth(), now.getDate())
  );
};

export async function getCompanyStats(companyId: string): Promise<Stats> {
  const count = await countCompanySaves(companyId);
  return { totalScans: count, totalSaves: count };
}

export const getCompanyHistory = (companyId: string) =>
  findCompanyHistory(companyId);
export const getCompanyHistoryWithInterests = (companyId: string) =>
  findCompanyHistoryWithInterests(companyId);
export const getCompanySavedStudentsWithCv = (companyId: string) =>
  findCompanySavedStudentsWithCv(companyId);
export const getCompanySavesForExport = (companyId: string) =>
  findCompanySavesForExport(companyId);
export const getStudentHistory = (studentId: string) =>
  findStudentHistory(studentId);

export async function getAdminScans() {
  const scans = await findAdminScans();
  return scans.map((scan) => ({
    id: `${scan.studentId}-${scan.createdAt.toISOString()}`,
    studentId: scan.studentId,
    createdAt: scan.createdAt,
    student: scan.student,
  }));
}
