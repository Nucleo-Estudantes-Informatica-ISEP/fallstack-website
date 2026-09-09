import { beforeEach, expect, test, vi } from "vitest";

import {
  createInterest,
  deleteInterest,
  findInterestById,
  findInterestsForAdmin,
  isUniqueInterestNameError,
  updateInterestName,
} from "../repositories/interestRepository";
import {
  createInterestForAdmin,
  deleteInterestForAdmin,
  listInterestsForAdmin,
  updateInterestForAdmin,
} from "./interestService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/interestRepository", () => ({
  createInterest: vi.fn(),
  deleteInterest: vi.fn(),
  findInterestById: vi.fn(),
  findInterests: vi.fn(),
  findInterestsForAdmin: vi.fn(),
  isUniqueInterestNameError: vi.fn(),
  updateInterestName: vi.fn(),
}));

const name = { PT: "Dados", EN: "Data" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isUniqueInterestNameError).mockReturnValue(false);
});

test("paginates the already-fetched interest list without a count query", async () => {
  vi.mocked(findInterestsForAdmin).mockResolvedValue([
    { id: "1" },
    { id: "2" },
    { id: "3" },
  ] as never);

  const result = await listInterestsForAdmin({
    page: 2,
    pageSize: 2,
    order: "asc",
  });

  expect(result).toEqual({ items: [{ id: "3" }], totalCount: 3 });
});

test("maps duplicate interest names to a friendly conflict", async () => {
  vi.mocked(createInterest).mockRejectedValue(new Error("P2002"));
  vi.mocked(isUniqueInterestNameError).mockReturnValue(true);

  await expect(createInterestForAdmin(name)).rejects.toMatchObject({
    message: "Já existe um interesse com este nome.",
    status: 409,
  });
});

test("maps duplicate interest names on update to the same conflict", async () => {
  vi.mocked(findInterestById).mockResolvedValue({ id: "1" } as never);
  vi.mocked(updateInterestName).mockRejectedValue(new Error("P2002"));
  vi.mocked(isUniqueInterestNameError).mockReturnValue(true);

  await expect(updateInterestForAdmin("1", name)).rejects.toMatchObject({
    status: 409,
  });
});

test("deletes an existing interest without blocking based on usage", async () => {
  vi.mocked(findInterestById).mockResolvedValue({
    id: "interest-1",
    name,
  });

  await deleteInterestForAdmin("interest-1");

  expect(deleteInterest).toHaveBeenCalledWith("interest-1");
});

test("returns 404 when deleting an unknown interest", async () => {
  vi.mocked(findInterestById).mockResolvedValue(null);

  await expect(deleteInterestForAdmin("missing")).rejects.toMatchObject({
    status: 404,
  });

  expect(deleteInterest).not.toHaveBeenCalled();
});
