import { z } from "zod";

import {
  PRIVACY_POLICY_VERSION,
  TERMS_VERSION,
} from "@/domain/student/signupPolicy";
import { STUDENT_YEAR } from "@/domain/student/year";

import { institutionalEmailSchema } from "./institutionalEmailSchema";
import { linkedinSchema } from "./linkedinSchema";
import {
  studentAvatarIdSchema,
  studentAvatarUrlSchema,
} from "./studentAvatarSchema";

export const postStudentSchema = z.object({
  institutionalEmail: institutionalEmailSchema,
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
  avatar: studentAvatarIdSchema.optional(),
  cv: z.uuid().optional(),
  // Supabase-based alternative fields
  avatarUrl: studentAvatarUrlSchema.optional(),
  cvId: z.uuid().optional(),
});
