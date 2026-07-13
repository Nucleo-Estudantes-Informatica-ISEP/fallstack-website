import { z } from "zod";

export const signInSchema = z.object({
  email: z.email().max(255),
  password: z.string().max(72),
});
