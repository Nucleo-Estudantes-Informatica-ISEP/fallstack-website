import "server-only";

import { signJwt, verifyJwt } from "@/application/services/authService";
import { isStudentCode } from "@/domain/student/studentCode";

import { findStudentByCode } from "../repositories/studentRepository";

export const studentPreviewCookieName = "fallstack-student-preview";
export const studentPreviewTtlSeconds = 15 * 60;

export function studentCodeFromPreview(
  token: string | undefined,
  companyId: string
) {
  if (!token) return null;
  const claims = verifyJwt(token, { algorithms: ["HS256"] });
  return claims &&
    typeof claims === "object" &&
    "purpose" in claims &&
    claims.purpose === "student-pass" &&
    "exp" in claims &&
    typeof claims.exp === "number" &&
    "companyId" in claims &&
    claims.companyId === companyId &&
    "code" in claims &&
    typeof claims.code === "string" &&
    isStudentCode(claims.code)
    ? claims.code
    : null;
}

export async function jwtStudent(
  input: string | { token: string },
  companyId: string
) {
  let code: string;
  if (typeof input === "string") code = input;
  else {
    const claims = verifyJwt(input.token, { algorithms: ["HS256"] });
    if (
      !claims ||
      typeof claims !== "object" ||
      !("purpose" in claims) ||
      (claims.purpose !== "attendance" &&
        (claims.purpose !== "student-pass" ||
          !("companyId" in claims) ||
          claims.companyId !== companyId)) ||
      !("exp" in claims) ||
      typeof claims.exp !== "number" ||
      !("code" in claims) ||
      typeof claims.code !== "string"
    )
      return null;
    code = claims.code;
  }
  if (!isStudentCode(code) || !(await findStudentByCode(code))) return null;
  return {
    code,
    token: signJwt(
      { code, companyId, purpose: "student-pass" },
      { expiresIn: studentPreviewTtlSeconds, algorithm: "HS256" }
    ),
  };
}
