import { z } from "zod";

export const postCompanySchema = z.object({
  name: z.string(),
  tier: z.enum(["DIAMOND", "GOLD", "SILVER", "BRONZE"]),
  avatarUrl: z.url().optional(),
});
