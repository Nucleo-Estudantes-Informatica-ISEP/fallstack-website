import { z } from "zod";

export const cvUploadSchema = z.union([
  z.object({ uploadId: z.string().uuid() }), // Firebase flow
  z.object({ id: z.string().uuid() }), // Supabase flow
]);
