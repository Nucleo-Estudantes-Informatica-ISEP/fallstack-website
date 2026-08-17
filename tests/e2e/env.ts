import { z } from "zod";

const yesNoFlag = z.enum(["yes", "no"]).optional();

const parsedEnv = z
  .object({
    CI: z.string().min(1).optional(),
    CONFIRM_NON_PRODUCTION: yesNoFlag,
    E2E_ALLOW_UPLOAD_TICKETS: yesNoFlag,
    E2E_BASE_URL: z.url().optional(),
    E2E_STUDENT_STORAGE_STATE: z.string().min(1).optional(),
    E2E_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    E2E_SUPABASE_URL: z.url().optional(),
    E2E_VERIFY_BUCKET_RESTRICTIONS: yesNoFlag,
  })
  .parse(process.env);

export const e2eEnv = {
  ci: parsedEnv.CI !== undefined,
  confirmNonProduction: parsedEnv.CONFIRM_NON_PRODUCTION === "yes",
  allowUploadTickets: parsedEnv.E2E_ALLOW_UPLOAD_TICKETS === "yes",
  baseUrl: parsedEnv.E2E_BASE_URL,
  storageState: parsedEnv.E2E_STUDENT_STORAGE_STATE,
  supabaseAnonKey: parsedEnv.E2E_SUPABASE_ANON_KEY,
  supabaseUrl: parsedEnv.E2E_SUPABASE_URL,
  verifyBucketRestrictions: parsedEnv.E2E_VERIFY_BUCKET_RESTRICTIONS === "yes",
} as const;
