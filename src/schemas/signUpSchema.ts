import { z } from "zod";

export const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(["COMPANY"]).optional(),
});
