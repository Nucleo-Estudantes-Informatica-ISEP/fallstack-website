export interface StudentDto {
  id: string;
  code: string;
  name: string;
  bio: string | null;
  year: string;
  cv: string | null;
  linkedin: string | null;
  github: string | null;
  avatar: string | null;
  user: {
    email: string;
  };
}

export type StudentSummaryDto = Omit<StudentDto, "user">;

type StudentEntity = StudentSummaryDto & {
  user: { email: string };
};

export const toStudentDto = (student: StudentEntity): StudentDto => ({
  ...toStudentSummaryDto(student),
  user: { email: student.user.email },
});

export const toStudentSummaryDto = (
  student: StudentSummaryDto
): StudentSummaryDto => ({
  id: student.id,
  code: student.code,
  name: student.name,
  bio: student.bio,
  year: student.year,
  cv: student.cv,
  linkedin: student.linkedin,
  github: student.github,
  avatar: student.avatar,
});
