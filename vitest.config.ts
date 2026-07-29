import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: { runtime: "automatic" },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Mirrors tsconfig.json's "~/*" -> "./*" mapping, which Next's own
      // bundler already resolves (used for ~/public/*.png-style static
      // asset imports) - Vitest doesn't share Next's webpack config, so
      // without this any file importing through "~" fails to resolve at
      // all in tests, not just the image import specifically.
      "~": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      ".claude/worktrees/**",
      "tests/e2e/playwright/**",
    ],
  },
});
