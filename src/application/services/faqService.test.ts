import { beforeEach, expect, test, vi } from "vitest";

import {
  bulkUpdateFaqOrder,
  createFaqEntry,
  findFaqEntriesByIds,
  findFaqEntryById,
  findMaxFaqOrder,
  isUniqueConstraintError,
  updateFaqEntry,
} from "../repositories/faqRepository";
import { withTransaction } from "../repositories/transaction";
import {
  createFaqEntryForAdmin,
  deleteFaqEntryForAdmin,
  updateFaqEntryForAdmin,
  updateFaqOrder,
} from "./faqService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/faqRepository", () => ({
  findAllFaqEntries: vi.fn(),
  findFaqEntriesByIds: vi.fn(),
  findFaqEntriesForAdmin: vi.fn(),
  countFaqEntriesForAdmin: vi.fn(),
  findFaqEntryById: vi.fn(),
  findMaxFaqOrder: vi.fn(),
  createFaqEntry: vi.fn(),
  updateFaqEntry: vi.fn(),
  deleteFaqEntry: vi.fn(),
  bulkUpdateFaqOrder: vi.fn(),
  isUniqueConstraintError: vi.fn(),
}));
vi.mock("../repositories/transaction", () => ({
  withTransaction: vi.fn(),
}));

const transaction = {} as never;
const question = { PT: "Q?", EN: "Question?" };
const answer = { PT: "A.", EN: "Answer." };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findMaxFaqOrder).mockResolvedValue(-1);
  vi.mocked(isUniqueConstraintError).mockReturnValue(false);
  vi.mocked(withTransaction).mockImplementation(async (callback) =>
    callback(transaction)
  );
});

test("a new entry with no explicit order lands at the end of the list", async () => {
  vi.mocked(findMaxFaqOrder).mockResolvedValue(4);
  vi.mocked(createFaqEntry).mockResolvedValue({ id: "f1" } as never);

  await createFaqEntryForAdmin({ question, answer });

  expect(withTransaction).toHaveBeenCalledOnce();
  expect(findMaxFaqOrder).toHaveBeenCalledWith(transaction);
  expect(createFaqEntry).toHaveBeenCalledWith(
    { question, answer, order: 5 },
    transaction
  );
});

test("an explicit order is respected over the computed default", async () => {
  vi.mocked(findMaxFaqOrder).mockResolvedValue(4);
  vi.mocked(createFaqEntry).mockResolvedValue({ id: "f1" } as never);

  await createFaqEntryForAdmin({ question, answer, order: 0 });

  expect(findMaxFaqOrder).not.toHaveBeenCalled();
  expect(createFaqEntry).toHaveBeenCalledWith(
    { question, answer, order: 0 },
    transaction
  );
});

test("a position conflict on create surfaces as a 409", async () => {
  vi.mocked(createFaqEntry).mockRejectedValue(new Error("P2002"));
  vi.mocked(isUniqueConstraintError).mockReturnValue(true);

  await expect(
    createFaqEntryForAdmin({ question, answer })
  ).rejects.toMatchObject({ status: 409 });
});

test("a position conflict on update surfaces as a 409", async () => {
  vi.mocked(findFaqEntryById).mockResolvedValue({ id: "f1" } as never);
  vi.mocked(updateFaqEntry).mockRejectedValue(new Error("P2002"));
  vi.mocked(isUniqueConstraintError).mockReturnValue(true);

  await expect(
    updateFaqEntryForAdmin("f1", { question })
  ).rejects.toMatchObject({ status: 409 });
});

test("updating a missing entry throws Not found before touching the repository", async () => {
  vi.mocked(findFaqEntryById).mockResolvedValue(null);

  await expect(
    updateFaqEntryForAdmin("missing", { question })
  ).rejects.toMatchObject({ message: "Not found", status: 404 });
  expect(updateFaqEntry).not.toHaveBeenCalled();
});

test("deleting a missing entry throws Not found", async () => {
  vi.mocked(findFaqEntryById).mockResolvedValue(null);

  await expect(deleteFaqEntryForAdmin("missing")).rejects.toMatchObject({
    message: "Not found",
    status: 404,
  });
});

test("does nothing for an empty order update", async () => {
  await updateFaqOrder([]);

  expect(findFaqEntriesByIds).not.toHaveBeenCalled();
  expect(bulkUpdateFaqOrder).not.toHaveBeenCalled();
});

test("commits a reorder once every referenced id is confirmed to exist", async () => {
  vi.mocked(findFaqEntriesByIds).mockResolvedValue([
    { id: "a" },
    { id: "b" },
  ] as never);

  await updateFaqOrder([
    { id: "a", order: 1 },
    { id: "b", order: 0 },
  ]);

  expect(findFaqEntriesByIds).toHaveBeenCalledWith(["a", "b"]);
  expect(bulkUpdateFaqOrder).toHaveBeenCalledWith([
    { id: "a", order: 1 },
    { id: "b", order: 0 },
  ]);
});

test("rejects a reorder referencing an id that no longer exists, without saving", async () => {
  vi.mocked(findFaqEntriesByIds).mockResolvedValue([{ id: "a" }] as never);

  await expect(
    updateFaqOrder([{ id: "deleted-elsewhere", order: 0 }])
  ).rejects.toMatchObject({ message: "Not found", status: 404 });
  expect(bulkUpdateFaqOrder).not.toHaveBeenCalled();
});

test("surfaces a concurrent FAQ position collision as a retryable 409", async () => {
  vi.mocked(findFaqEntriesByIds).mockResolvedValue([{ id: "a" }] as never);
  vi.mocked(bulkUpdateFaqOrder).mockRejectedValue(new Error("P2002"));
  vi.mocked(isUniqueConstraintError).mockReturnValue(true);

  await expect(updateFaqOrder([{ id: "a", order: 0 }])).rejects.toMatchObject({
    status: 409,
  });
});
