export interface SessionDto {
  role: "STUDENT" | "EMPLOYEE" | null;
  adminRole: "ADMIN" | "SUPER_ADMIN" | null;
  student: {
    code: string;
    name: string;
  } | null;
  /** AuthNEI nei-member grant; routes staff without a student profile. */
  neiMember?: boolean;
}

export const toSessionDto = (session: SessionDto): SessionDto => ({
  role: session.role,
  adminRole: session.adminRole,
  student: session.student
    ? { code: session.student.code, name: session.student.name }
    : null,
  neiMember: session.neiMember === true,
});
