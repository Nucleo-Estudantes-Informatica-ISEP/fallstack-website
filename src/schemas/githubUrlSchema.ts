import { z } from "zod";

import { githubHost, safeHttpsLink } from "@/domain/outboundLink";

export const githubOrEmptySchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || safeHttpsLink(value, githubHost) !== null,
    "Use an HTTPS GitHub URL"
  );
