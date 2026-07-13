export interface SavedStudentDto {
  studentId: string;
  createdAt: string;
  comment: string | null;
  student: {
    code: string;
    name: string;
  };
  savedBy: {
    name: string;
    company: { name: string } | null;
  };
}

interface SavedStudentEntity {
  studentId: string;
  createdAt: Date | string;
  comment: string | null;
  student: { code: string; name: string };
  savedBy: {
    name: string;
    company?: { name: string };
  };
}

export const toSavedStudentDto = (
  saved: SavedStudentEntity
): SavedStudentDto => ({
  studentId: saved.studentId,
  createdAt: new Date(saved.createdAt).toISOString(),
  comment: saved.comment,
  student: { code: saved.student.code, name: saved.student.name },
  savedBy: {
    name: saved.savedBy.name,
    company: saved.savedBy.company
      ? { name: saved.savedBy.company.name }
      : null,
  },
});

export interface AdminScanDto {
  id: string;
  studentId: string;
  createdAt: string;
  student: {
    name: string;
    user: { email: string };
  };
}

export const toAdminScanDto = (scan: {
  studentId: string;
  createdAt: Date | string;
  student: { name: string; user: { email: string } };
}): AdminScanDto => ({
  id: `${scan.studentId}-${new Date(scan.createdAt).toISOString()}`,
  studentId: scan.studentId,
  createdAt: new Date(scan.createdAt).toISOString(),
  student: {
    name: scan.student.name,
    user: { email: scan.student.user.email },
  },
});
