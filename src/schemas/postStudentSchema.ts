import { z } from "zod";

export const postStudentSchema = z.object({
  name: z.string(),
  bio: z.string().optional(),
  year: z.enum([
    "1º Ano Licenciatura",
    "2º Ano Licenciatura",
    "3º Ano Licenciatura",
    "1º Ano Mestrado",
    "2º Ano Mestrado",
  ]),
  interests: z.array(z.string()),
  avatar: z.uuid().optional(),
  cv: z.uuid().optional(),
  // Supabase-based alternative fields
  avatarUrl: z.url().optional(),
  cvId: z.uuid().optional(),
});
