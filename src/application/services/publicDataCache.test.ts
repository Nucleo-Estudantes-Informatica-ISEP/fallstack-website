// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Language } from "@/domain/i18n/translations";

import { createPublicDataCache, PUBLIC_DATA_TTL_MS } from "./publicDataCache";

vi.mock("server-only", () => ({}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => vi.useRealTimers());

test("concurrent misses share one load, hits avoid I/O, callers cannot mutate cached data", async () => {
  const cache = createPublicDataCache();
  const load = vi
    .fn<() => Promise<{ name: string }[]>>()
    .mockResolvedValue([{ name: "Public" }]);
  const results = await Promise.all(
    Array.from({ length: 100 }, () => cache.read("faqs", Language.PT, load))
  );
  expect(load).toHaveBeenCalledOnce();
  results[0][0].name = "mutated";
  expect(await cache.read("faqs", Language.PT, load)).toEqual([
    { name: "Public" },
  ]);
  vi.advanceTimersByTime(PUBLIC_DATA_TTL_MS);
  load.mockResolvedValue([{ name: "Fresh" }]);
  expect(await cache.read("faqs", Language.PT, load)).toEqual([
    { name: "Fresh" },
  ]);
  expect(load).toHaveBeenCalledTimes(2);
});

test("failed loads share a short retry window and recover without serving stale data", async () => {
  const cache = createPublicDataCache();
  const load = vi.fn().mockRejectedValue(new Error("DB unavailable"));
  await expect(cache.read("faqs", Language.PT, load)).rejects.toThrow(
    "DB unavailable"
  );
  await expect(cache.read("faqs", Language.PT, load)).rejects.toThrow(
    "DB unavailable"
  );
  expect(load).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(1000);
  load.mockResolvedValue([]);
  expect(await cache.read("faqs", Language.PT, load)).toEqual([]);
  expect(load).toHaveBeenCalledTimes(2);
});

test("invalidation expires every language of the selected dataset only", async () => {
  const cache = createPublicDataCache();
  const load = vi.fn().mockResolvedValue([]);
  for (const language of [Language.PT, Language.EN])
    await cache.read("faqs", language, load);
  await cache.read("sponsors", Language.PT, load);
  cache.invalidate("faqs");
  for (const language of [Language.PT, Language.EN])
    await cache.read("faqs", language, load);
  await cache.read("sponsors", Language.PT, load);
  expect(load).toHaveBeenCalledTimes(5);
});

test("a read started before invalidation cannot repopulate the new cache generation", async () => {
  const cache = createPublicDataCache();
  let finish!: (value: string[]) => void;
  const oldRead = cache.read(
    "schedule",
    Language.PT,
    () =>
      new Promise<string[]>((resolve) => {
        finish = resolve;
      })
  );
  await Promise.resolve();
  cache.invalidate("schedule");
  const fresh = vi.fn().mockResolvedValue(["new"]);
  expect(await cache.read("schedule", Language.PT, fresh)).toEqual(["new"]);
  finish(["old"]);
  await oldRead;
  expect(await cache.read("schedule", Language.PT, fresh)).toEqual(["new"]);
  expect(fresh).toHaveBeenCalledOnce();
});

test("independent replicas and out-of-band writes converge within the hard TTL", async () => {
  const first = createPublicDataCache(),
    second = createPublicDataCache();
  const load = vi.fn().mockResolvedValue(["old"]);
  await first.read("companies", Language.PT, load);
  await second.read("companies", Language.PT, load);
  load.mockResolvedValue(["edited"]);
  first.invalidate("companies");
  expect(await first.read("companies", Language.PT, load)).toEqual(["edited"]);
  expect(await second.read("companies", Language.PT, load)).toEqual(["old"]);
  vi.advanceTimersByTime(PUBLIC_DATA_TTL_MS);
  expect(await second.read("companies", Language.PT, load)).toEqual(["edited"]);
});

test("expired data is never returned when its fresh load fails", async () => {
  const cache = createPublicDataCache();
  const load = vi.fn<() => Promise<string[]>>().mockResolvedValue(["old"]);
  await cache.read("faqs", Language.PT, load);
  vi.advanceTimersByTime(PUBLIC_DATA_TTL_MS);
  load.mockRejectedValue(new Error("unavailable"));
  await expect(cache.read("faqs", Language.PT, load)).rejects.toThrow(
    "unavailable"
  );
});
