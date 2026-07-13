import { z } from "zod";

export const requestResetSchema = z.object({
  email: z.string().email().max(255),
});
