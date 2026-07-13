import { z } from "zod";

export const requestResetSchema = z.object({
  email: z.string().email().max(255),
});

export const confirmResetSchema = z.object({
  password: z.string().min(8).max(72),
  code: z.string().min(1).max(2048),
});
