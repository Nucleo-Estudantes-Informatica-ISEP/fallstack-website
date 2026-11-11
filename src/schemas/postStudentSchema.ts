import { z } from "zod";

import { STUDENT_YEAR } from "@/domain/student/year";

import { linkedinSchema } from "./linkedinSchema";

export const postStudentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  bio: z.string().max(1000).optional(),
  linkedin: linkedinSchema.optional(),
  year: z.enum(Object.values(STUDENT_YEAR)),
  interests: z.array(z.uuid()).max(50),
  avatar: z.uuid().optional(),
  cv: z.uuid().optional(),
  // Supabase-based alternative fields
  avatarUrl: z.url().max(2048).optional(),
  cvId: z.uuid().optional(),
});
