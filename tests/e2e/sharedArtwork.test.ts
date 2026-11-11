// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

const root = path.resolve(__dirname, "../..");
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("retired backgrounds cannot remain in runtime references or public assets", () => {
  const retired =
    /bgHero|bgDates|bgInterview|bgHeadsUp|card_bg|auth-component|hero_privacy_policy|header-privacy-policy-background/;
  for (const file of readdirSync(path.join(root, "src"), {
    recursive: true,
    encoding: "utf8",
  })) {
    if (/\.(tsx?|css)$/.test(file))
      expect(source(`src/${file}`), file).not.toMatch(retired);
  }
  expect(
    readdirSync(path.join(root, "public"), {
      recursive: true,
      encoding: "utf8",
    }).filter((file) => retired.test(file))
  ).toEqual([]);
});

test("shared artwork uses cover and a contrast-safe scrim without fixed attachment or filters", () => {
  const css = source("src/app/globals.css");
  expect(css.replace(/\s+/g, " ")).toContain("center / cover no-repeat");
  expect(css).toContain("linear-gradient(#14141499, #14141499)");
  expect(css).not.toMatch(/background-attachment|filter:\s*blur/);
  const channel = (20 * 0.6 + 255 * 0.4) / 255;
  const luminance = ((channel + 0.055) / 1.055) ** 2.4;
  expect(1.05 / (luminance + 0.05)).toBeGreaterThan(4.5);
  expect(source("src/app/layout.tsx")).not.toContain("rsms.me");
  expect(css).not.toContain("InterVariable");
});
