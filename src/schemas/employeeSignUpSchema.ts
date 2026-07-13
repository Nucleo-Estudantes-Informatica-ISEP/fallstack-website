import { z } from "zod";

export const employeeSignUpSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().min(2, "Name is too short").max(100),
  linkedin: z
    .string()
    .trim()
    .url("Invalid LinkedIn URL")
    .max(2048)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  companyCode: z
    .string()
    .regex(/^\d{8}$/u, "Company code must be exactly 8 digits"),
});

export type EmployeeSignUpInput = z.infer<typeof employeeSignUpSchema>;
