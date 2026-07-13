import { z } from "zod";

export const changePasswordSchema = z.object({
  email: z.string().max(255),
  password: z.string().min(6).max(72),
  confirmPassword: z.string().min(6).max(72),
});
