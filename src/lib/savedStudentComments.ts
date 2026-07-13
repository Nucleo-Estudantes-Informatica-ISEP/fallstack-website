export interface SavedStudentCsvEntry {
  comment: string | null;
  student: {
    name: string;
    code: string;
  };
}

export function savedStudentCommentData(comment?: string | null) {
  return { comment: comment ?? null };
}

export function savedStudentCompanyWhere(studentId: string, companyId: string) {
  return { studentId, savedBy: { companyId } };
}

function csvCell(value: string) {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function buildSavedStudentsCsv(entries: SavedStudentCsvEntry[]) {
  return [
    "Nome,Código,Comentário",
    ...entries.map(({ student, comment }) =>
      [student.name, student.code, comment ?? ""].map(csvCell).join(",")
    ),
  ].join("\n");
}
