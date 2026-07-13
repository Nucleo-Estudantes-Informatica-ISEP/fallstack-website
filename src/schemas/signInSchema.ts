import { z } from "zod";

import { EmailSchema } from "@/schemas/customEmailZod";

export const signInSchema = z.object({
  email: EmailSchema,
  password: z.string().max(72),
});
