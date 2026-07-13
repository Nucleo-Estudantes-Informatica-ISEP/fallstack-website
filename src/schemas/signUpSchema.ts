import { z } from "zod";
import { EmailSchema } from "@/schemas/customEmailZod";

export const signUpSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8),
  role: z.enum(["COMPANY"]).optional(),
});
