import { z } from "zod";

import { parseCompanyTier } from "@/domain/Company/company-tier";
import { logoSchema } from "@/schemas/logoSchema";

const tierSchema = z.string().transform((val, ctx) => {
  try {
    return parseCompanyTier(val);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid tier";
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    return z.NEVER;
  }
});

export const createAdminCompanySchema = z.object({
  name: z.string().min(1).max(100),
  tier: tierSchema,
  avatar: logoSchema.nullable().optional(),
  website: z.url().max(2048).nullable().optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const updateAdminCompanySchema = z
  .object({
    name: z.string().min(1).max(100),
    tier: tierSchema,
    avatar: logoSchema.nullable(),
    website: z.url().max(2048).nullable(),
    active: z.boolean(),
    order: z.number().int(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
