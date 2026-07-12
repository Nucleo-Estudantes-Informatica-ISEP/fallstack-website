import { z } from "zod";

export const saveSchema = z.object({
  token: z.string().max(2048).optional(),
});
