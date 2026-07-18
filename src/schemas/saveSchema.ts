import { z } from "zod";

export const saveSchema = z.object({
  token: z.string().max(2048).optional(),
  comment: z.string().max(1000).optional(),
});

export const savedCommentSchema = z.object({
  studentId: z.string().uuid(),
  comment: z.string().max(1000).nullable(),
});
