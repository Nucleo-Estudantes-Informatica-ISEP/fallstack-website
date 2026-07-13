import { z } from "zod";
import { parseCompanyTier } from "@/domain/Company/company-tier";

export const postCompanySchema = z.object({
  name: z.string(),
  tier: z.string().transform((val, ctx) => {
    try {
      return parseCompanyTier(val);
    } catch (e: any) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: e.message });
      return z.NEVER;
    }
  }),
  avatarUrl: z.url().optional(),
});
