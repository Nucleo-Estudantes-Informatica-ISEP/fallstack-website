import { z } from "zod";

export const userInterestsSchema = z.object({
  interests: z.array(z.string().min(1).max(50)).max(50),
});
