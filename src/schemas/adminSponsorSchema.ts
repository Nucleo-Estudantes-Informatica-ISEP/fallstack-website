import { z } from "zod";

import { logoSchema } from "@/schemas/logoSchema";
import { websiteUrlSchema } from "@/schemas/websiteUrlSchema";

export const createAdminSponsorSchema = z.object({
  name: z.string().min(1).max(100),
  logo: logoSchema,
  website: websiteUrlSchema.nullable().optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const updateAdminSponsorSchema = z
  .object({
    name: z.string().min(1).max(100),
    logo: logoSchema,
    website: websiteUrlSchema.nullable(),
    active: z.boolean(),
    order: z.number().int(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
