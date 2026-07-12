import path from "node:path";
import { fileURLToPath } from "node:url";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import importHelpers from "eslint-plugin-import-helpers";
import tailwindcss from "eslint-plugin-tailwindcss";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    // generated at build/dev time, never committed (see .gitignore) — nothing
    // for a fresh checkout to lint, but excluded so local `pnpm lint` after a
    // build doesn't choke on minified/generated output
    ignores: ["public/sw.js", "public/workbox-*.js", "next-env.d.ts"],
  },
  {
    extends: compat.extends(
      "next/core-web-vitals",
      "plugin:@typescript-eslint/recommended",
      "plugin:prettier/recommended",
      "plugin:tailwindcss/recommended"
    ),

    plugins: {
      "@typescript-eslint": typescriptEslint,
      prettier,
      "import-helpers": importHelpers,
      tailwindcss,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
      },

      parser: tsParser,
    },

    rules: {
      "prettier/prettier": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-function": "off",
      "react-hooks/rules-of-hooks": "warn",
      "tailwindcss/classnames-order": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "tailwindcss/no-custom-classname": "off",
    },
  },
  {
    // next.config.js is loaded by Next's own CJS runtime, not bundled — it
    // must stay require()-based regardless of the app's ESM/TS rules
    files: ["next.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
