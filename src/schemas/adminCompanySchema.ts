import { z } from "zod";

import { parseCompanyTier } from "@/domain/Company/company-tier";

const tierSchema = z.string().transform((val, ctx) => {
  try {
    return parseCompanyTier(val);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid tier";
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    return z.NEVER;
  }
});

// Logos may be an absolute URL (a freshly-uploaded Storage object) or an
// absolute path into public/ (the pre-existing static roster assets - see
// the company_display_fields migration's backfill, which references them
// by path rather than re-uploading them).
const logoSchema = z
  .string()
  .max(2048)
  .refine(
    (value) => value.startsWith("/") || z.url().safeParse(value).success,
    {
      message: 'Must be an absolute URL or an absolute path starting with "/"',
    }
  );

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
