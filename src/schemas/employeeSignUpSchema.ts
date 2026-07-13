import { z } from "zod";
import { EmailSchema } from "@/schemas/customEmailZod";

export const employeeSignUpSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name is too short"),
  linkedin: z
    .string()
    .trim()
    .url("Invalid LinkedIn URL")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  companyCode: z
    .string()
    .regex(/^\d{8}$/u, "Company code must be exactly 8 digits"),
});

export type EmployeeSignUpInput = z.infer<typeof employeeSignUpSchema>;
