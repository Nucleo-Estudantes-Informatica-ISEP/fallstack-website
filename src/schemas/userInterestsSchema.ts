import { z } from "zod";

export const userInterestsSchema = z.object({
  interests: z.array(z.uuid()).max(50),
});
