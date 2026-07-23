import "server-only";

import JSZip from "jszip";

import { buildSavedStudentsCsv } from "@/lib/savedStudentComments";
import { createAdminClient } from "@/utils/supabase/admin";

import { findCompanySavedStudentsWithCv } from "../repositories/savedStudentRepository";

const sanitizeFilename = (value: string) =>
  value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");

export async function createCompanyCvZip(companyId: string) {
  const savedStudents = await findCompanySavedStudentsWithCv(companyId);
  const studentsWithCv = savedStudents.filter(({ student }) => student.cv);

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
  zip.file("dados.csv", buildSavedStudentsCsv(savedStudents));
  return zip.generateAsync({ type: "uint8array" });
}
