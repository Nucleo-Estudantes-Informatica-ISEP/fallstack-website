import { z } from "zod";

// Single source of truth for the accepted LinkedIn profile format. The
// signup form, the profile editor and both student API schemas use it.
// Written without nested quantifiers so long input cannot cause
// catastrophic backtracking when it runs on the server.
const LINKEDIN_SEGMENT = "[A-Za-zÀ-ú0-9ç_-]+";
const LINKEDIN_PATTERN = new RegExp(
  `^https://www\\.linkedin\\.com/in/${LINKEDIN_SEGMENT}(?:/${LINKEDIN_SEGMENT})*/?$`
);

export const LINKEDIN_FORMAT_ERROR =
  "O teu Linkedin não segue o formato correto!";

export function isValidLinkedinUrl(value: string): boolean {
  return value.length <= 2048 && LINKEDIN_PATTERN.test(value);
}

export const linkedinSchema = z
  .string()
  .max(2048)
  .refine(isValidLinkedinUrl, { message: LINKEDIN_FORMAT_ERROR });
