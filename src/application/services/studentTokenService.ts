import "server-only";

import { signJwt, verifyJwt } from "@/application/services/authService";

import { findStudentByCode } from "../repositories/studentRepository";

export async function jwtStudent(input: string | { token: string }) {
  let code: string;
  if (typeof input === "string") code = input;
  else {
    const claims = verifyJwt(input.token, { algorithms: ["HS256"] });
    if (
      !claims ||
      typeof claims !== "object" ||
      !("purpose" in claims) ||
      !["attendance", "student-pass"].includes(claims.purpose) ||
      !("exp" in claims) ||
      typeof claims.exp !== "number" ||
      !("code" in claims) ||
      typeof claims.code !== "string"
    )
      return null;
    code = claims.code;
  }
  if (!(await findStudentByCode(code))) return null;
  return signJwt({ code, purpose: "student-pass" }, { expiresIn: 15 * 60 });
}
