import { z } from "zod";

export const createAdminActionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  points: z.number().int().min(0),
  altText: z.string().max(200).nullable().optional(),
  isLive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  companyId: z.uuid().nullable().optional(),
});

export const updateAdminActionSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    points: z.number().int().min(0),
    altText: z.string().max(200).nullable(),
    isLive: z.boolean(),
    isVisible: z.boolean(),
    companyId: z.uuid().nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
