import { z } from "zod";

export const postCompanySchema = z.object({
  name: z.string().min(1).max(100),
  rankId: z.uuid(),
  avatarUrl: z.url().max(2048).optional(),
});
