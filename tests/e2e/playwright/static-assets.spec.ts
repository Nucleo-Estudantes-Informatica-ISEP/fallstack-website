import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const directory = path.resolve(__dirname, "../../../public/assets/optimized");

test("optimized assets serve WebP bytes with immutable caching and conditional GET", async ({
  request,
}) => {
  for (const file of readdirSync(directory)) {
    const url = `/assets/optimized/${file}`;
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/webp");
    expect(response.headers()["cache-control"]).toBe(
      "public, max-age=31536000, immutable"
    );
    const bytes = await response.body();
    expect(bytes.equals(readFileSync(path.join(directory, file)))).toBe(true);
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    expect(file).toContain(`.${hash}.webp`);

    const etag = response.headers().etag;
    expect(etag).toBeTruthy();
    const cached = await request.get(url, {
      headers: { "If-None-Match": etag },
    });
    expect(cached.status()).toBe(304);
    expect((await cached.body()).length).toBe(0);
  }
});

test("stable public URLs revalidate while application responses stay private", async ({
  request,
}) => {
  for (const url of [
    "/assets/images/logo_white.svg",
    "/assets/fonts/inter.ttf",
    "/icons/maskable_icon_x192.png",
    "/google-wallet/add-to-google-wallet-pt.svg",
  ]) {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe(
      "public, max-age=3600, must-revalidate"
    );
  }

  const login = await request.get("/login");
  expect(login.status()).toBe(200);
  expect(login.headers()["cache-control"]).toContain("no-store");
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: 200 });
  expect(health.headers()["cache-control"] ?? "").not.toContain("public");

  const missing = await request.get("/assets/optimized/missing.webp");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["cache-control"] ?? "").not.toContain("public");
});
