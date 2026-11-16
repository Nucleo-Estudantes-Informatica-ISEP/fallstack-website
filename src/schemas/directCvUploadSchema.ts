import { z } from "zod";

import config from "@/config";

export const directCvUploadSchema = z
  .object({
    filename: z
      .string()
      .min(5)
      .max(255)
      .regex(/\.pdf$/i),
    contentType: z.literal("application/pdf"),
    size: z.number().int().positive().max(config.uploads.cv.maxSize),
  })
  .strict();

export const cvUploadIdSchema = z.object({ uploadId: z.uuid() }).strict();

export const cvUploadPartSchema = cvUploadIdSchema
  .extend({
    partNumber: z.number().int().min(1).max(2),
    checksum: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  })
  .strict();
