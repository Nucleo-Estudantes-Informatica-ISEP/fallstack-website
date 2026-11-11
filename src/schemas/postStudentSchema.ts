import { z } from "zod";

import {
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
} from "@/domain/student/signupPolicy";
import { STUDENT_YEAR } from "@/domain/student/year";

import { linkedinSchema } from "./linkedinSchema";

export const postStudentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  course: z.string().trim().min(1).max(100),
  privacyPolicyAccepted: z.literal(true),
  termsAccepted: z.literal(true),
  privacyPolicyVersion: z.literal(PRIVACY_POLICY_VERSION),
  termsVersion: z.literal(TERMS_VERSION),
  bio: z.string().max(1000).optional(),
  linkedin: linkedinSchema.nullable().optional(),
  year: z.enum(Object.values(STUDENT_YEAR)),
  interests: z.array(z.uuid()).max(50),
  avatar: z.uuid().optional(),
  cv: z.uuid().optional(),
  // Supabase-based alternative fields
  avatarUrl: z.url().max(2048).optional(),
  cvId: z.uuid().optional(),
});
