import { z } from "zod";

export const saveSchema = z.object({
  token: z.string().optional(),
  comment: z.string().optional(),
});

export const savedCommentSchema = z.object({
  studentId: z.string().uuid(),
  comment: z.string().nullable(),
});
