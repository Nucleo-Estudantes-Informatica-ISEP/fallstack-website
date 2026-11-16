import { z } from "zod";

export const createAdminEmployeeSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(100),
  companyId: z.uuid(),
  linkedin: z.string().max(200).optional(),
});

export const updateAdminEmployeeSchema = z
  .object({
    name: z.string().min(1).max(100),
    linkedin: z.string().max(200).nullable(),
    companyId: z.uuid(),
    active: z.boolean(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
