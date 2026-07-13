import { z } from "zod";

import { EmailSchema } from "@/schemas/customEmailZod";

export const changePasswordSchema = z.object({
  email: EmailSchema,
  password: z.string().min(6).max(72),
  confirmPassword: z.string().min(6).max(72),
});
