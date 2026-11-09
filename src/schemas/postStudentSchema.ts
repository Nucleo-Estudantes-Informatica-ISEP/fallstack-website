import { z } from "zod";

export const postStudentSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(1000).optional(),
  year: z.enum([
    "1º Ano Licenciatura",
    "2º Ano Licenciatura",
    "3º Ano Licenciatura",
    "1º Ano Mestrado",
    "2º Ano Mestrado",
  ]),
  course: z.string().min(1).max(150),
  privacyPolicyAccepted: z.literal(true),
  termsAccepted: z.literal(true),
  linkedin: z
    .string()
    .trim()
    .url("Invalid LinkedIn URL")
    .max(2048)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? undefined : value)),
  interests: z.array(z.uuid()).max(50),
  avatar: z.uuid().optional(),
  cv: z.uuid().optional(),
  // Supabase-based alternative fields
  avatarUrl: z.url().max(2048).optional(),
  cvId: z.uuid().optional(),
});
