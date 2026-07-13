import { z } from "zod";
import { EmailSchema } from "@/schemas/customEmailZod";

export const requestResetSchema = z.object({
  email: EmailSchema,
});

export const confirmResetSchema = z.object({
  password: z.string().min(8).max(72),
  code: z.string().min(1).max(2048),
});
