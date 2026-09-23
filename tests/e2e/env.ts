import { z } from "zod";

const yesNoFlag = z.enum(["yes", "no"]).optional();

const parsedEnv = z
  .object({
    CI: z.string().min(1).optional(),
    CONFIRM_NON_PRODUCTION: yesNoFlag,
    E2E_ALLOW_UPLOADS: yesNoFlag,
    E2E_ADMIN_STORAGE_STATE: z.string().min(1).optional(),
    E2E_BASE_URL: z.url().optional(),
    E2E_EMPLOYEE_STORAGE_STATE: z.string().min(1).optional(),
    E2E_STUDENT_STORAGE_STATE: z.string().min(1).optional(),
    E2E_SUPER_ADMIN_STORAGE_STATE: z.string().min(1).optional(),
    E2E_VERIFY_UPLOAD_LIMITS: yesNoFlag,
  })
  .parse(process.env);

export const e2eEnv = {
  ci: parsedEnv.CI !== undefined,
  confirmNonProduction: parsedEnv.CONFIRM_NON_PRODUCTION === "yes",
  allowUploads: parsedEnv.E2E_ALLOW_UPLOADS === "yes",
  adminStorageState: parsedEnv.E2E_ADMIN_STORAGE_STATE,
  baseUrl: parsedEnv.E2E_BASE_URL,
  employeeStorageState: parsedEnv.E2E_EMPLOYEE_STORAGE_STATE,
  storageState: parsedEnv.E2E_STUDENT_STORAGE_STATE,
  superAdminStorageState: parsedEnv.E2E_SUPER_ADMIN_STORAGE_STATE,
  verifyUploadLimits: parsedEnv.E2E_VERIFY_UPLOAD_LIMITS === "yes",
} as const;
