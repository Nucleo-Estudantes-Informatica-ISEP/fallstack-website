import "server-only";

import JSZip from "jszip";

import { buildSavedStudentsCsv } from "@/lib/savedStudentComments";

import { findCompanySavedStudentsWithCv } from "../repositories/savedStudentRepository";
import { cvKey, getObject } from "./objectStorageService";

const sanitizeFilename = (value: string) =>
  value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");

export async function createCompanyCvZip(companyId: string) {
  const savedStudents = await findCompanySavedStudentsWithCv(companyId);
  const studentsWithCv = savedStudents.filter(({ student }) => student.cv);

  const zip = new JSZip();
  for (const { student } of studentsWithCv) {
    const file = await getObject("cv", cvKey(student.cv!));
    if (!file) continue;
    zip.file(
      `${student.code}-${sanitizeFilename(student.name)}.pdf`,
      Buffer.from(file.bytes)
    );
  }
  zip.file("dados.csv", buildSavedStudentsCsv(savedStudents));
  return zip.generateAsync({ type: "uint8array" });
}
