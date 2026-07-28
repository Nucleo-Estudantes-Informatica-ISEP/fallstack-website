import { z } from "zod";

import { parseCompanyTier } from "@/domain/company/company-tier";

export const postCompanySchema = z.object({
  name: z.string().min(1).max(100),
  tier: z.string().transform((val, ctx) => {
    try {
      return parseCompanyTier(val);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid tier";
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      return z.NEVER;
    }
  }),
  avatarUrl: z.url().max(2048).optional(),
});
