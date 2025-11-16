import { z } from "zod";

export const avatarSchema = z.object({
  uploadId: z.uuid(),
});
