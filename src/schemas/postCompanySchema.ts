import { z } from "zod";

export const postCompanySchema = z.object({
  name: z.string().min(1).max(100),
  tier: z.enum(["DIAMOND", "GOLD", "SILVER", "BRONZE"]),
  avatarUrl: z.url().max(2048).optional(),
});
