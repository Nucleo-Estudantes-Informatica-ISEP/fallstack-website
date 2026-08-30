import { vi } from "vitest";

export const TEST_SUPABASE_URL = "https://example.supabase.co";
export const TEST_SENTRY_DSN = "https://public@example.ingest.sentry.io/123";
export const TEST_SENTRY_ORIGIN = new URL(TEST_SENTRY_DSN).origin;
export const TEST_DOCUMENT_URI = "http://localhost:3000/";
export const TEST_BLOCKED_URI = "https://evil.example";
export const TEST_REPORT_ENDPOINT = "/api/csp-report";
export const UNTRUSTED_ORIGIN = "https://untrusted.example";

export function parseCsp(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp
      .split(";")
      .map((section) => section.trim())
      .filter(Boolean)
      .map((section) => {
        const [directive, ...sources] = section.split(/\s+/);
        return [directive, sources];
      })
  );
}

export function getDirective(csp: string, directive: string): string[] {
  return parseCsp(csp)[directive] ?? [];
}

export function getAllSources(csp: string): string[] {
  return Object.values(parseCsp(csp)).flat();
}

export function setDefaultTrustedEnv() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", TEST_SUPABASE_URL);
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", TEST_SENTRY_DSN);
}
