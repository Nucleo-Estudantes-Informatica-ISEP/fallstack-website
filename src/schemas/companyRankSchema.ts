import { z } from "zod";

// Hex or a Tailwind-style color token - CompanyRankStyle stores whatever the
// admin types verbatim, rendered as an inline gradient (see
// domain/company/services/rank-styling.ts), so no format is enforced beyond
// "not empty".
const colorStopSchema = z.string().min(1).max(30);

const rankStyleSchema = z.object({
  gradientFromColor: colorStopSchema,
  gradientFromStop: colorStopSchema,
  gradientToColor: colorStopSchema,
  gradientToStop: colorStopSchema,
  hasInternalPage: z.boolean().optional(),
  showsPromoVideo: z.boolean().optional(),
});

export const createAdminCompanyRankSchema = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int().optional(),
  style: rankStyleSchema,
});

export const updateAdminCompanyRankSchema = z
  .object({
    name: z.string().min(1).max(100),
    order: z.number().int(),
    style: rankStyleSchema.partial(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

export const updateCompanyRankOrderSchema = z.object({
  updates: z.array(
    z.object({
      id: z.uuid(),
      order: z.number().int(),
    })
  ),
});

export const updateCompanyRankBoardSchema = z.object({
  updates: z.array(
    z.object({
      id: z.uuid(),
      rankId: z.uuid(),
      order: z.number().int(),
    })
  ),
});
