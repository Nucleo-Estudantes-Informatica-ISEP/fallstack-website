import { z } from "zod";

export const patchStudentSchema = z
  .object({
    bio: z.string(),
    linkedin: z.string(),
    github: z.string(),
    interests: z.array(z.string()),
  })
  .partial();
