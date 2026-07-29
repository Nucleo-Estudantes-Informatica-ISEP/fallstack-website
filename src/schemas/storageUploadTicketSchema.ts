import { z } from "zod";

// This authorizes a direct-to-Storage upload. File bytes never pass through
// the Next.js process; the browser validates the leading signature first.
export const storageUploadTicketSchema = z.object({
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});
