// @vitest-environment node
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  defaultConfig,
  type NextConfigComplete,
} from "next/dist/server/config-shared";
import withPWA, { type PluginOptions } from "@ducanh2912/next-pwa";
import { expect, test } from "vitest";
import webpack from "webpack";

import { publicDataRuntimeCaching } from "./publicDataRuntimeCaching";

test("installed PWA plugin generates the offline fallback before default routes", async () => {
  const dest = await mkdtemp(path.join(tmpdir(), "fallstack-pwa-"));
  try {
    const config = withPWA({
      dest: path.relative(process.cwd(), dest),
      cacheStartUrl: false,
      dynamicStartUrl: false,
      fallbacks: { document: "/offline.html" },
      extendDefaultRuntimeCaching: true,
      workboxOptions: {
        // Keep the isolated worker build readable and avoid minifier workers.
        mode: "development",
        additionalManifestEntries: [],
        runtimeCaching: publicDataRuntimeCaching.map((rule) => ({
          ...rule,
          // The plugin mutates rule options when installing fallbacks.
          ...(rule.options ? { options: { ...rule.options } } : {}),
        })) as NonNullable<PluginOptions["workboxOptions"]>["runtimeCaching"],
      },
    })({});
    const result = config.webpack!(
      {
        output: { path: dest, publicPath: "/_next/" },
        entry: async () => ({}),
      },
      {
        dir: process.cwd(),
        dev: false,
        isServer: false,
        buildId: "offline-regression",
        config: defaultConfig as unknown as NextConfigComplete,
        defaultLoaders: { babel: {} },
        totalPages: 0,
        webpack,
      }
    );
    const worker = result.plugins.find(
      (plugin: { constructor: { name: string } }) =>
        plugin.constructor.name === "GenerateSW"
    );
    const [rule] = worker.config.runtimeCaching;
    expect(rule.handler).toBe("NetworkOnly");
    expect(rule.options?.plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ handlerDidError: expect.any(Function) }),
      ])
    );
    expect(worker.config.additionalManifestEntries).toContainEqual({
      url: "/offline.html",
      revision: "offline-regression",
    });
    const compiler = webpack({
      ...result,
      mode: "development",
      devtool: false,
    })!;
    try {
      const stats = await new Promise<webpack.Stats | undefined>(
        (resolve, reject) =>
          compiler.run((error, stats) =>
            error ? reject(error) : resolve(stats)
          )
      );
      expect(stats?.toJson({ all: false, errors: true }).errors).toEqual([]);
      const sw = await readFile(path.join(dest, "sw.js"), "utf8");
      const publicRule = sw.slice(
        sw.indexOf("registerRoute("),
        sw.indexOf('cacheName: "google-fonts-webfonts"')
      );
      expect(publicRule).toContain("NetworkOnly");
      expect(publicRule).toContain("handlerDidError");
      expect(sw).toContain('"/offline.html"');
    } finally {
      await new Promise<void>((resolve, reject) =>
        compiler.close((error) => (error ? reject(error) : resolve()))
      );
    }
  } finally {
    await rm(dest, { recursive: true, force: true });
  }
});
