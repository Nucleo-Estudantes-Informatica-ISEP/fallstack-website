import { z } from "zod";

const adminRoleSchema = z.enum(["ADMIN", "SUPER_ADMIN"]);

export const createAdminAccountSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  adminRole: adminRoleSchema,
});

export const updateAdminAccountSchema = z
  .object({
    name: z.string().min(1).max(100),
    adminRole: adminRoleSchema,
    password: z.string().min(8),
    active: z.boolean(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
