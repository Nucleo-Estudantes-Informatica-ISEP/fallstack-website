// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

import { Language } from "@/domain/i18n/translations";

vi.mock("server-only", () => ({}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each(["development", "production"])(
  "%s module reloads use the correct cache lifetime",
  async (env) => {
    vi.stubEnv("NODE_ENV", env);
    vi.resetModules();
    const first = (await import("./publicDataCache")).publicDataCache;
    first.invalidate();
    await first.read("faqs", Language.PT, async () => ["old"]);
    vi.resetModules();
    const reloaded = (await import("./publicDataCache")).publicDataCache;
    if (env === "development") {
      expect(reloaded).not.toBe(first);
      expect(
        await reloaded.read("faqs", Language.PT, async () => ["edited"])
      ).toEqual(["edited"]);
    } else {
      expect(reloaded).toBe(first);
      expect(
        await reloaded.read("faqs", Language.PT, async () => ["edited"])
      ).toEqual(["old"]);
    }
    first.invalidate();
    reloaded.invalidate();
  }
);
