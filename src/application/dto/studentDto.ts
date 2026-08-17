import { studentYearLabel } from "@/domain/student/year";
import type { StudentYear } from "@/domain/student/year";

export interface StudentDto {
  id: string;
  code: string;
  name: string;
  bio: string | null;
  year: string;
  cv: string | null;
  // Non-null once the twice-yearly retention purge (#286) has cleared `cv` -
  // drives the profile "your CV was removed" banner.
  cvPurgedAt: string | null;
  linkedin: string | null;
  github: string | null;
  avatar: string | null;
  user: {
    email: string;
  };
}

export type StudentSummaryDto = Omit<StudentDto, "user">;

interface StudentSummaryEntity {
  id: string;
  code: string;
  name: string;
  bio: string | null;
  year: StudentYear;
  cv: string | null;
  cvPurgedAt: Date | null;
  linkedin: string | null;
  github: string | null;
  avatar: string | null;
}

type StudentEntity = StudentSummaryEntity & {
  user: { email: string };
};

export const toStudentDto = (student: StudentEntity): StudentDto => ({
  ...toStudentSummaryDto(student),
  user: { email: student.user.email },
});

export const toStudentSummaryDto = (
  student: StudentSummaryEntity
): StudentSummaryDto => ({
  id: student.id,
  code: student.code,
  name: student.name,
  bio: student.bio,
  year: studentYearLabel(student.year),
  cv: student.cv,
  cvPurgedAt: student.cvPurgedAt?.toISOString() ?? null,
  linkedin: student.linkedin,
  github: student.github,
  avatar: student.avatar,
});

export interface AdminStudentDto extends StudentDto {
  yearKey: StudentYear;
  active: boolean;
}

export const toAdminStudentDto = (
  student: StudentEntity & { user: { email: string; active: boolean } }
): AdminStudentDto => ({
  ...toStudentDto(student),
  yearKey: student.year,
  active: student.user.active,
});
