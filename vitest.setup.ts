import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

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
