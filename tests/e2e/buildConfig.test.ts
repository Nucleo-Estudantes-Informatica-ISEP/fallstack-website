// @vitest-environment node
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import type { NextConfig } from "next";
import { expect, test } from "vitest";

const require = createRequire(new URL("../../next.config.js", import.meta.url));
const source = readFileSync(
  new URL("../../next.config.js", import.meta.url),
  "utf8"
);

test.each([
  [{}, true],
  [{ SENTRY_AUTH_TOKEN: "test-token" }, true],
  [{ SENTRY_AUTH_TOKEN: "test-token", SENTRY_ORG: "org" }, true],
  [{ SENTRY_AUTH_TOKEN: "test-token", SENTRY_PROJECT: "project" }, true],
  [
    { SENTRY_AUTH_TOKEN: "", SENTRY_ORG: "org", SENTRY_PROJECT: "project" },
    true,
  ],
  [
    {
      SENTRY_AUTH_TOKEN: "test-token",
      SENTRY_ORG: "org",
      SENTRY_PROJECT: "project",
    },
    false,
  ],
])("source maps require complete upload credentials: %j", (env, disabled) => {
  let sentryOptions:
    | {
        sourcemaps: { disable: boolean; deleteSourcemapsAfterUpload: boolean };
        errorHandler?: unknown;
        useRunAfterProductionCompileHook: boolean;
        telemetry: boolean;
      }
    | undefined;
  const configModule = { exports: {} as NextConfig };
  runInNewContext(source, {
    module: configModule,
    process: { env },
    require: (name: string) => {
      if (name !== "@sentry/nextjs/config") return require(name);
      return {
        withSentryConfig: (
          config: NextConfig,
          options: typeof sentryOptions
        ) => {
          sentryOptions = options;
          return require(name).withSentryConfig(config, options);
        },
      };
    },
  });
  expect(sentryOptions?.sourcemaps).toEqual({
    disable: disabled,
    deleteSourcemapsAfterUpload: true,
  });
  // Configured uploads must fail visibly rather than silently ship broken maps.
  expect(sentryOptions?.errorHandler).toBeUndefined();
  expect(sentryOptions?.useRunAfterProductionCompileHook).toBe(true);
  expect(sentryOptions?.telemetry).toBe(false);
  expect(configModule.exports.compiler?.runAfterProductionCompile).toBeTypeOf(
    "function"
  );
  expect(configModule.exports.experimental).toMatchObject({
    webpackBuildWorker: true,
    optimizePackageImports: ["@mynaui/icons-react"],
  });
  expect(
    configModule.exports.experimental?.webpackMemoryOptimizations
  ).not.toBe(true);
  expect(configModule.exports.webpack).toBeTypeOf("function");
  expect(configModule.exports.eslint?.ignoreDuringBuilds).not.toBe(true);
  expect(configModule.exports.typescript?.ignoreBuildErrors).not.toBe(true);
});

test("Docker reuses Next's disk cache and honors its heap build argument", () => {
  const dockerfile = readFileSync(
    new URL("../../Dockerfile", import.meta.url),
    "utf8"
  );
  expect(dockerfile).toContain("FROM deps AS builder");
  expect(dockerfile).not.toContain("RUN npx prisma generate");
  expect(dockerfile).toContain("target=/app/.next/cache,sharing=locked");
  expect(dockerfile).toContain("ENV NODE_OPTIONS=$NODE_OPTIONS");
  expect(dockerfile.match(/^ENV NODE_OPTIONS=/gm)).toHaveLength(1);
});
