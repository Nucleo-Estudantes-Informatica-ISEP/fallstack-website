import { z } from "zod";

import { safeHttpsLink } from "@/domain/outboundLink";

export const websiteUrlSchema = z
  .string()
  .trim()
  .refine((value) => safeHttpsLink(value) !== null, "Use an HTTPS website URL");
