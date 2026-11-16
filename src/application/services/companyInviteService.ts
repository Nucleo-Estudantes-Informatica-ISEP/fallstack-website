import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { HttpError } from "@/types/HttpError";

import { updateCompanyInviteCodeHash } from "../repositories/companyInviteRepository";
import { findCompanyById } from "../repositories/companyRepository";

export async function rotateCompanyInviteCode(companyId: string) {
  if (!(await findCompanyById(companyId)))
    throw new HttpError("Not found", 404);

  const code = `fs_emp_${randomBytes(20).toString("hex")}`;
  const hash = createHash("sha256").update(code, "utf8").digest("hex");
  const now = new Date();
  const updated = await updateCompanyInviteCodeHash(companyId, hash, now);
  return {
    code,
    updatedAt: (updated.employeeInviteCodeUpdatedAt ?? now).toISOString(),
  };
}
