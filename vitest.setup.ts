import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Test-only values for lazy server environment validation. Individual tests
// can override these; no test connects to this S3 endpoint by default.
const testEnv = {
  JWT_SECRET: "test-only-secret-at-least-32-characters-long",
  S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_ACCESS_KEY_ID: "test-access-key",
  S3_SECRET_ACCESS_KEY: "test-secret-key",
  S3_BUCKET_AVATARS: "test-avatars",
  S3_BUCKET_CVS: "test-cvs",
  AUTH_ISSUER_URL: "https://auth.example.test",
  AUTH_PROJECT_ID: "test-project",
  AUTH_GLOBAL_PROJECT_ID: "test-global-project",
  AUTH_CLIENT_ID: "test-client",
  AUTH_CLIENT_SECRET: "test-client-secret",
  AUTH_SECRET: "test-only-auth-secret-at-least-32-characters-long",
  AUTH_SCOPES: "openid profile email",
  AUTH_ROLE_CLAIM: "test-role-claim",
  AUTH_GLOBAL_ROLE_CLAIM: "test-global-role-claim",
  AUTH_REDIRECT_URI: "http://localhost:3000/api/auth/callback/zitadel",
  AUTH_POST_LOGOUT_REDIRECT_URI: "http://localhost:3000",
  ZITADEL_ORG_ID: "test-org",
  ZITADEL_ROLE_ASSIGNER_TOKEN: "test-token",
};
for (const [key, value] of Object.entries(testEnv)) process.env[key] ??= value;

afterEach(cleanup);

// react@18.3.1 (the version actually installed) doesn't export `cache` -
// Next.js's own bundler substitutes a build that does when compiling
// Server Component/server-only code, but Vitest resolves plain node_modules
// react, so any module using `cache()` (e.g. sessionService.ts) throws
// "cache is not a function" on import otherwise. A pass-through stub is
// fine for tests: `cache()` is a per-request memoization optimization, not
// something correctness depends on.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: <T>(fn: T) => fn };
});
