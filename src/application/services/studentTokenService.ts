"use server";

import "server-only";

import { signJwt } from "@/application/services/authService";

import { findStudentByCode } from "../repositories/studentRepository";

export async function jwtStudent(code: string) {
  if (!(await findStudentByCode(code))) return null;
  return signJwt({ code }, { expiresIn: 15 * 60 });
}
