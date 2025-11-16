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
]);
