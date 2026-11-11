import { z } from "zod";

// Single source of truth for the accepted LinkedIn profile format. The value
// is rendered as a link href, so only https LinkedIn profile URLs may pass:
// `z.url()` alone would also accept `javascript:` and arbitrary hosts.
// Written without nested quantifiers to avoid catastrophic backtracking.
const SEGMENT = "[A-Za-zÀ-ú0-9ç_-]+";
const LINKEDIN_PATTERN = new RegExp(
  `^https://www\\.linkedin\\.com/in/${SEGMENT}(?:/${SEGMENT})*/?$`
);

export const linkedinUrlSchema = z
  .string()
  .max(2048)
  .regex(LINKEDIN_PATTERN, "O teu Linkedin não segue o formato correto!");

// An empty string clears the field.
export const linkedinOrEmptySchema = z.union([
  z.literal(""),
  linkedinUrlSchema,
]);
