import "server-only";

import JSZip from "jszip";

import { BASE_URL } from "@/services/api";
import { signJwt } from "@/services/authService";
import { HttpError } from "@/types/HttpError";
import { createAdminClient } from "@/utils/supabase/admin";

import { findCompanyById } from "../repositories/companyRepository";
import {
  findCompanySavedStudentsWithCv,
  findCompanySavesForExport,
  isStudentSaved,
} from "../repositories/savedStudentRepository";
import { findStudentByCode } from "../repositories/studentRepository";

const csvCell = (value: unknown) => {
  let cell = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
};

export async function createCompanyCsv(companyId: string) {
  const saves = await findCompanySavesForExport(companyId);
  const rows = ["Nome,Email,Linkedin,Github,CV,Data guardado,"];
  const token = signJwt({ id: companyId });
  for (const save of saves) {
    rows.push(
      [
        save.student.name,
        save.student.user.email,
        save.student.linkedin || "",
        save.student.github || "",
        `${BASE_URL}/export/${save.student.code}/cv?token=${token}`,
        new Date(save.createdAt).toLocaleString("pt-PT").replace(",", ""),
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return rows.join("\n");
}

export async function getExportCvUrl(companyId: string, studentCode: string) {
  if (!(await findCompanyById(companyId))) throw new HttpError("Forbidden", 403);
  const student = await findStudentByCode(studentCode);
  if (!student) throw new HttpError("Este perfil não existe.", 404);
  if (!(await isStudentSaved(companyId, studentCode)))
    throw new HttpError("Forbidden", 403);
  if (!student.cv) throw new HttpError("O estudante não tem CV.", 404);
  const signed = await createAdminClient()
    .storage.from("cvs")
    .createSignedUrl(`distribution/cv/${student.cv}.pdf`, 60 * 5);
  if (signed.error || !signed.data) throw new HttpError("CV not found", 404);
  return signed.data.signedUrl;
}

const sanitizeFilename = (value: string) =>
  value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");

export async function createCompanyCvZip(companyId: string) {
  const savedStudents = await findCompanySavedStudentsWithCv(companyId);
  const studentsWithCv = savedStudents.filter(({ student }) => student.cv);
  if (!studentsWithCv.length)
    throw new HttpError("Nenhum CV disponível para exportar.", 404);

  const admin = createAdminClient();
  const zip = new JSZip();
  for (const { student } of studentsWithCv) {
    const signed = await admin.storage
      .from("cvs")
      .createSignedUrl(`distribution/cv/${student.cv}.pdf`, 60 * 5);
    if (signed.error || !signed.data?.signedUrl) continue;
    const response = await fetch(signed.data.signedUrl);
    if (!response.ok) continue;
    zip.file(
      `${student.code}-${sanitizeFilename(student.name)}.pdf`,
      Buffer.from(await response.arrayBuffer())
    );
  }
  if (!Object.keys(zip.files).length)
    throw new HttpError("Não foi possível gerar o ficheiro zip.", 500);
  return zip.generateAsync({ type: "uint8array" });
}
