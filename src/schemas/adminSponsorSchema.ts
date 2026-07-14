import { z } from "zod";

// Logos may be an absolute URL (a freshly-uploaded Storage object) or an
// absolute path into public/ (the pre-existing static sponsor assets - see
// the add_sponsor_table migration's backfill, which references them by
// path rather than re-uploading them).
const logoSchema = z
  .string()
  .max(2048)
  .refine(
    (value) => value.startsWith("/") || z.url().safeParse(value).success,
    {
      message: 'Must be an absolute URL or an absolute path starting with "/"',
    }
  );

export const createAdminSponsorSchema = z.object({
  name: z.string().min(1).max(100),
  logo: logoSchema,
  website: z.url().max(2048).nullable().optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const updateAdminSponsorSchema = z
  .object({
    name: z.string().min(1).max(100),
    logo: logoSchema,
    website: z.url().max(2048).nullable(),
    active: z.boolean(),
    order: z.number().int(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });
