import { z } from "zod";

export const saveStudentAdminSchema = z.object({
  studentEmailNumber: z.string().min(1).max(100),
  companyId: z.string().min(1).max(191),
});
