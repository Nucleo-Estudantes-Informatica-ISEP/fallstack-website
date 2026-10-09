import { beforeEach, expect, test, vi } from "vitest";

import { withLockedUser } from "./userRepository";

const { queryRaw, findUnique, transaction } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({ default: { $transaction: transaction } }));

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (work) =>
    work({ $queryRaw: queryRaw, user: { findUnique } })
  );
});

test("locks the account before re-reading it and running Wallet work", async () => {
  const user = { id: "11111111-2222-3333-4444-555555555555" };
  findUnique.mockResolvedValue(user);
  const work = vi.fn().mockResolvedValue("done");

  await expect(withLockedUser(user.id, work)).resolves.toBe("done");

  expect(queryRaw.mock.calls[0]?.[0].join("?")).toBe(
    'SELECT id FROM "User" WHERE id = ?::uuid FOR UPDATE'
  );
  expect(queryRaw.mock.calls[0]?.[1]).toBe(user.id);
  expect(queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
    findUnique.mock.invocationCallOrder[0]!
  );
  expect(findUnique.mock.invocationCallOrder[0]).toBeLessThan(
    work.mock.invocationCallOrder[0]!
  );
  expect(work).toHaveBeenCalledWith(
    user,
    expect.objectContaining({ user: { findUnique } })
  );
});

test("passes a deleted account as null instead of stale session data", async () => {
  findUnique.mockResolvedValue(null);
  const work = vi.fn().mockResolvedValue(undefined);
  await withLockedUser("11111111-2222-3333-4444-555555555555", work);
  expect(work).toHaveBeenCalledWith(null, expect.anything());
});
