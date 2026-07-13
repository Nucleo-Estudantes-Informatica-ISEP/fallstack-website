import { z } from "zod";

export const signUpSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(8).max(72),
  role: z.enum(["COMPANY"]).optional(),
});
