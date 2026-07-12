import "server-only";

import { HttpError } from "@/types/HttpError";
import config from "@/config";

import { assertStudentCanBeSaved, findBoothAction } from "../domain/saveRules";
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
} from "../repositories/savedStudentRepository";
import {
  findStudentByCode,
  findStudentByEmail,
} from "../repositories/studentRepository";
import { completeAction } from "./actionService";

const boothActions: Record<string, string> = {
  akapeople: config.constants.actionNames.akaPeopleBooth,
  natixis: config.constants.actionNames.natixisBooth,
  apr: config.constants.actionNames.aprBooth,
  "hitachi solutions": config.constants.actionNames.hitachiBooth,
  convatec: config.constants.actionNames.convatecBooth,
  niw: config.constants.actionNames.niwBooth,
  deloitte: config.constants.actionNames.deloitteBooth,
  accenture: config.constants.actionNames.accentureBooth,
  armis: config.constants.actionNames.armisBooth,
  devscope: config.constants.actionNames.devscopeBooth,
  "insur:it msg": config.constants.actionNames.msgInsurItBooth,
  glintt: config.constants.actionNames.glinttBooth,
  konkconsulting: config.constants.actionNames.konkConsultingBooth,
};

export async function saveStudent(input: {
  studentCode: string;
  employeeId: string;
  companyId: string;
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
    const saved = await createSavedStudent(student.id, input.employeeId);
    if (input.completeBoothAction) {
      const company = await findCompanyName(input.companyId);
      if (!company) throw new HttpError("Company not found", 404);
      const action = findBoothAction(company.name, boothActions);
      if (action) await completeAction(student.code, action);
    }
    return saved;
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw new HttpError("Student already saved", 400);
    throw error;
  }
}

export async function saveStudentAsAdmin(
  emailOrNumber: string,
  companyId: string
) {
  const email = emailOrNumber.trim().endsWith("@isep.ipp.pt")
    ? emailOrNumber.trim()
    : `${emailOrNumber.trim()}@isep.ipp.pt`;
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

export async function getStudentStats(code: string) {
  const count = await countStudentSaves(code);
  return [count, count];
}

export const getTodayStudentStats = (studentId: string) => {
  const now = new Date();
  return countStudentSavesSince(
    studentId,
    new Date(now.getFullYear(), now.getMonth(), now.getDate())
  );
};

export async function getCompanyStats(companyId: string) {
  const count = await countCompanySaves(companyId);
  return [count, count];
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
