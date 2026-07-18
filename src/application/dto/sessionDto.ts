export interface SessionDto {
  role: "STUDENT" | "EMPLOYEE";
  student: {
    code: string;
    name: string;
  } | null;
}

export const toSessionDto = (session: SessionDto): SessionDto => ({
  role: session.role,
  student: session.student
    ? { code: session.student.code, name: session.student.name }
    : null,
});
