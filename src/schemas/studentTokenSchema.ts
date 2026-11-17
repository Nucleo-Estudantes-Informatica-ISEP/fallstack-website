import { z } from "zod";

import {
  isStudentCode,
  normalizeStudentCode,
} from "@/domain/student/studentCode";

export const studentTokenSchema = z.union([
  z.object({
    code: z
      .string()
      .max(64)
      .transform(normalizeStudentCode)
      .refine(isStudentCode, { message: "Invalid student code" }),
  }),
  z.object({ token: z.string().min(1).max(8192) }),
]);
