import { z } from "zod";

import { institutionalEmailSchema } from "./institutionalEmailSchema";
import { linkedinOrEmptySchema } from "./linkedinSchema";

export const patchStudentSchema = z
  .object({
    course: z.string().trim().min(1).max(100),
    institutionalEmail: institutionalEmailSchema,
    bio: z.string().max(1000),
    linkedin: linkedinOrEmptySchema,
    github: z.string().max(2048),
    interests: z.array(z.uuid()).max(50),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
