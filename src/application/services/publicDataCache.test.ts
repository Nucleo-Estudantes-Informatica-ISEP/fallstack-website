// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Language } from "@/domain/i18n/translations";

import {
  afterPublicDataWrite,
  createPublicDataCache,
  PUBLIC_DATA_LOAD_TIMEOUT_MS,
  PUBLIC_DATA_TTL_MS,
  publicDataCache,
} from "./publicDataCache";

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

test("slow pending loads stay shared and receive a full TTL after completion", async () => {
  const cache = createPublicDataCache();
  let finish!: (value: string[]) => void;
  const load = vi.fn(
    () =>
      new Promise<string[]>((resolve) => {
        finish = resolve;
      })
  );
  const first = cache.read("faqs", Language.PT, load);
  await Promise.resolve();
  vi.advanceTimersByTime(PUBLIC_DATA_LOAD_TIMEOUT_MS - 1);
  const second = cache.read("faqs", Language.PT, load);
  await Promise.resolve();
  expect(load).toHaveBeenCalledOnce();
  finish(["loaded"]);
  await Promise.all([first, second]);
  vi.advanceTimersByTime(PUBLIC_DATA_TTL_MS - 1);
  expect(await cache.read("faqs", Language.PT, load)).toEqual(["loaded"]);
  expect(load).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(1);
  load.mockResolvedValue(["fresh"]);
  expect(await cache.read("faqs", Language.PT, load)).toEqual(["fresh"]);
  expect(load).toHaveBeenCalledTimes(2);
});

test.each([false, true])(
  "write rejection=%s invalidates both languages and preserves the outcome",
  async (reject) => {
    publicDataCache.invalidate();
    const load = vi.fn().mockResolvedValue(["old"]);
    for (const language of [Language.PT, Language.EN])
      await publicDataCache.read("companies", language, load);
    await publicDataCache.read("sponsors", Language.PT, load);
    const error = new Error("reply lost after commit");
    load.mockResolvedValue(["committed"]);
    const write = afterPublicDataWrite(
      "companies",
      reject ? Promise.reject(error) : Promise.resolve("result")
    );
    if (reject) await expect(write).rejects.toBe(error);
    else await expect(write).resolves.toBe("result");
    for (const language of [Language.PT, Language.EN])
      expect(await publicDataCache.read("companies", language, load)).toEqual([
        "committed",
      ]);
    expect(await publicDataCache.read("sponsors", Language.PT, load)).toEqual([
      "old",
    ]);
    expect(load).toHaveBeenCalledTimes(5);
    publicDataCache.invalidate();
  }
);

test.each([false, true])(
  "timed-out loads recover and late rejection=%s cannot replace fresh data",
  async (rejectLate) => {
    const cache = createPublicDataCache();
    let resolve!: (value: string[]) => void;
    let reject!: (error: Error) => void;
    const load = vi.fn(
      () =>
        new Promise<string[]>((yes, no) => {
          resolve = yes;
          reject = no;
        })
    );
    const report = vi.fn();
    const first = cache.read("faqs", Language.PT, load, report);
    const second = cache.read("faqs", Language.PT, load, report);
    const results = Promise.allSettled([first, second]);
    await vi.advanceTimersByTimeAsync(PUBLIC_DATA_LOAD_TIMEOUT_MS);
    for (const result of await results) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected")
        expect(result.reason.message).toMatch(/timed out/);
    }
    expect(report).toHaveBeenCalledOnce();
    await expect(cache.read("faqs", Language.PT, load, report)).rejects.toThrow(
      /timed out/
    );
    expect(load).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000);
    const fresh = vi.fn().mockResolvedValue(["fresh"]);
    expect(await cache.read("faqs", Language.PT, fresh, report)).toEqual([
      "fresh",
    ]);
    if (rejectLate) reject(new Error("late"));
    else resolve(["old"]);
    await Promise.resolve();
    expect(await cache.read("faqs", Language.PT, fresh, report)).toEqual([
      "fresh",
    ]);
    expect(fresh).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledOnce();
  }
);
