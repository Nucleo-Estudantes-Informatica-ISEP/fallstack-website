// @vitest-environment node
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { expect, test } from "vitest";

const nextConfig = createRequire(import.meta.url)("../../next.config.js");

async function cacheControl(url: string) {
  const response = await unstable_getResponseFromNextConfig({
    url: `https://fallstack.example${url}`,
    nextConfig,
  });
  expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  return response.headers.get("Cache-Control");
}

test.each([
  "/assets/images/logo_white.svg",
  "/assets/fonts/inter.ttf",
  "/icons/maskable_icon_x192.png",
  "/google-wallet/add-to-google-wallet-pt.svg",
])("stable public asset %s has bounded, revalidating caching", async (url) => {
  expect(await cacheControl(url)).toBe("public, max-age=3600, must-revalidate");
});

test("optimized images use content hashes and immutable caching", async () => {
  const directory = path.resolve(__dirname, "../../public/assets/optimized");
  const files = readdirSync(directory);
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const bytes = readFileSync(path.join(directory, file));
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    expect(file).toMatch(new RegExp(`\\.${hash}\\.webp$`));
    expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
    expect(await cacheControl(`/assets/optimized/${file}`)).toBe(
      "public, max-age=31536000, immutable"
    );
  }
});

test("optimized source references resolve and stay within the transfer budget", () => {
  const root = path.resolve(__dirname, "../..");
  const sourceDirectory = path.join(root, "src");
  const references = new Set<string>();
  for (const file of readdirSync(sourceDirectory, {
    recursive: true,
    encoding: "utf8",
  })) {
    if (!/\.(tsx?|css)$/.test(file)) continue;
    const source = readFileSync(path.join(sourceDirectory, file), "utf8");
    for (const match of source.matchAll(
      /\/assets\/optimized\/[\w.-]+\.webp/g
    )) {
      references.add(match[0]);
    }
    expect(source).not.toMatch(
      /\/assets\/images\/(?:bgHero|bgDates|bgInterview|bgHeadsUp|card_bg)\.svg|\/assets\/images\/(?:auth-component|hero_privacy_policy)\.png/
    );
  }
  let totalBytes = 0;
  for (const url of references) {
    const bytes = readFileSync(path.join(root, "public", url));
    expect(bytes.length, url).toBeLessThan(150_000);
    totalBytes += bytes.length;
  }
  expect(references.size).toBe(7);
  expect(totalBytes).toBeLessThan(350_000);
});

test.each([
  "/",
  "/login",
  "/student/example",
  "/api/session",
  "/api/media/avatar/example",
  "/api/students/example/cv/file",
  "/sw.js",
  "/workbox-example.js",
  "/manifest.webmanifest",
  "/_next/image?url=%2Fassets%2Fimages%2Flogo_dark.png&w=640&q=75",
])("public-asset policy does not override %s", async (url) => {
  expect(await cacheControl(url)).toBeNull();
});
