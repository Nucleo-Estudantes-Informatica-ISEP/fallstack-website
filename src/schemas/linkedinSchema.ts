import { z } from "zod";

// Single source of truth for the accepted LinkedIn profile format. The signup
// form, the profile editor, the admin editor and every student API schema use
// it. The value is rendered as a link href, so only https LinkedIn profile
// URLs may pass: `z.url()` alone would also accept `javascript:` and arbitrary
// hosts. Written without nested quantifiers so long input cannot cause
// catastrophic backtracking when it runs on the server.
// LinkedIn serves public profiles from `linkedin.com`, `www` and two-letter
// country hosts such as `ca.linkedin.com` or `pt.linkedin.com`.
const LINKEDIN_HOST = "(?:(?:www|[a-z]{2})\\.)?linkedin\\.com";
const LINKEDIN_SEGMENT = "[A-Za-zÀ-ú0-9ç_%-]+";
const LINKEDIN_PATTERN = new RegExp(
  `^https://${LINKEDIN_HOST}/in/${LINKEDIN_SEGMENT}(?:/${LINKEDIN_SEGMENT})*/?$`
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

// An empty string clears the field.
export const linkedinOrEmptySchema = z.union([z.literal(""), linkedinSchema]);
