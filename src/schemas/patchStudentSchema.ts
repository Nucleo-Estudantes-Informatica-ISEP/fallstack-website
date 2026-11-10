import { z } from "zod";

import { linkedinSchema } from "./linkedinSchema";

export const patchStudentSchema = z
  .object({
    bio: z.string().max(1000),
    // An empty string clears the field; anything else must match the format.
    linkedin: z.union([z.literal(""), linkedinSchema]),
    github: z.string().max(2048),
    interests: z.array(z.uuid()).max(50),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
