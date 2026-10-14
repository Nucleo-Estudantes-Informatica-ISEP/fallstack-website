import { expect, test, vi } from "vitest";

import { planStorageCleanup } from "./storageCleanupRepository";

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  student: { count: vi.fn() },
  storageDeletion: { findMany: vi.fn() },
}));
vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({
  default: { $transaction: (work: (db: typeof tx) => unknown) => work(tx) },
}));

test("bounded claim lookups preserve tombstones beyond the first batch", async () => {
  tx.$queryRaw
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ count: 0 }])
    .mockResolvedValueOnce([]);
  tx.student.count.mockResolvedValue(0);
  const objects = Array.from({ length: 2001 }, (_, index) => ({
    kind: "avatar" as const,
    key: `distribution/avatar/${index}`,
  }));
  tx.storageDeletion.findMany.mockImplementation(async ({ where }) => {
    expect(where.key.in.length).toBeLessThanOrEqual(1000);
    return objects
      .slice(0, 2000)
      .filter(({ key }) => where.key.in.includes(key));
  });
  const plan = await planStorageCleanup(new Date(), objects, false);
  expect(plan.orphans).toEqual([objects[2000]]);
  expect(tx.storageDeletion.findMany).toHaveBeenCalledTimes(3);
});
