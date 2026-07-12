import { z } from "zod";

import { isIsepEmail } from "@/utils/isepEmail";

export const signUpSchema = z.object({
  email: z.email().refine(isIsepEmail, "Invalid ISEP email"),
  password: z.string().min(8),
});
