import { z } from "zod";

import { linkedinOrEmptySchema } from "./linkedinSchema";

const employeeLinkedinSchema = z
  .string()
  .trim()
  .max(200)
  .pipe(linkedinOrEmptySchema);

export const createAdminEmployeeSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(100),
  companyId: z.uuid(),
  linkedin: employeeLinkedinSchema.optional(),
});

export const updateAdminEmployeeSchema = z
  .object({
    name: z.string().min(1).max(100),
    linkedin: employeeLinkedinSchema.nullable(),
    companyId: z.uuid(),
    active: z.boolean(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
