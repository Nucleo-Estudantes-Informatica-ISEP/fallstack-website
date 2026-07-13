import { z } from "zod";

import { EmailSchema } from "@/schemas/customEmailZod";
import { isIsepEmail } from "@/utils/isepEmail";

export const signUpSchema = z.object({
  email: EmailSchema.refine(isIsepEmail, "Invalid ISEP email"),
  password: z.string().min(8).max(72),
});
