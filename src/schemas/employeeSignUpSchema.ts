import { z } from "zod";

export const companyInviteCodePattern = /^[A-Za-z0-9_-]{8,80}$/u;

export const employeeSignUpSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  linkedin: z
    .string()
    .trim()
    .url("Invalid LinkedIn URL")
    .max(2048)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? undefined : value)),
  companyCode: z
    .string()
    .trim()
    .regex(companyInviteCodePattern, "Invalid company code"),
});

export type EmployeeSignUpInput = z.infer<typeof employeeSignUpSchema>;
