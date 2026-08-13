import { z } from "zod";

import { FACT_ICON_NAMES } from "@/domain/company/factIcons";
import { websiteUrlSchema } from "@/schemas/websiteUrlSchema";

const optionalLink = websiteUrlSchema
  .optional()
  .or(z.literal(""))
  .transform((value) => (value === "" ? undefined : value));

export const socialLinksSchema = z.object({
  twitter: optionalLink,
  facebook: optionalLink,
  instagram: optionalLink,
  youtube: optionalLink,
  linkedin: optionalLink,
});

export const factSchema = z.object({
  iconName: z.enum(FACT_ICON_NAMES as [string, ...string[]]),
  description: z.string().min(1).max(300),
  className: z.string().max(100).optional(),
});

// bodyText empty ("") means "no profile" - companyService deletes the
// CompanyProfile row instead of writing one with an empty required field.
export const updateCompanyProfileSchema = z.object({
  bodyText: z.string().max(10000),
  videoTitle: z.string().max(200).nullable().optional(),
  videoHref: optionalLink.nullable(),
  socialLinks: socialLinksSchema.optional(),
  facts: z.array(factSchema).max(20).optional(),
});

export const updateCompanyDisplayStyleSchema = z.object({
  logoWidth: z.number().int().positive().nullable().optional(),
  logoHeight: z.number().int().positive().nullable().optional(),
  className: z.string().max(100).nullable().optional(),
});

export const updateCompanyInterestsSchema = z.object({
  interestIds: z.array(z.uuid()),
});
