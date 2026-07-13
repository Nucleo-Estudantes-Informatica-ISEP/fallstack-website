import { z } from "zod";

export const patchStudentSchema = z
  .object({
    bio: z.string().max(1000),
    linkedin: z.string().max(2048),
    github: z.string().max(2048),
    interests: z.array(z.string().min(1).max(50)).max(50),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
