import { z } from "zod";

export const saveSchema = z.object({
  token: z.string().optional(),
  comment: z.string().optional(),
});
