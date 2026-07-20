import { z } from "zod";

import { STUDENT_YEAR } from "@/domain/Student/year";

const yearSchema = z.enum(
  Object.keys(STUDENT_YEAR) as [keyof typeof STUDENT_YEAR]
);

export const createAdminStudentSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  year: yearSchema,
  bio: z.string().max(1000).optional(),
});

export const updateAdminStudentSchema = z
  .object({
    name: z.string().min(1).max(100),
    bio: z.string().max(1000).nullable(),
    year: yearSchema,
    linkedin: z.string().max(200).nullable(),
    github: z.string().max(200).nullable(),
    avatar: z.string().max(2048).nullable(),
    password: z.string().min(8),
    active: z.boolean(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
