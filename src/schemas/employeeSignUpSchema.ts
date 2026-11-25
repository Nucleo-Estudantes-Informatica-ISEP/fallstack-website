import { z } from "zod";

import { linkedinOrEmptySchema } from "./linkedinSchema";

export const companyInviteCodePattern = /^[A-Za-z0-9_-]{8,80}$/u;

export const employeeSignUpSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  linkedin: z
    .string()
    .trim()
    .pipe(linkedinOrEmptySchema)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  companyCode: z
    .string()
    .trim()
    .regex(companyInviteCodePattern, "Invalid company code"),
});

export type EmployeeSignUpInput = z.infer<typeof employeeSignUpSchema>;
