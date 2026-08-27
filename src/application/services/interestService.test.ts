import { beforeEach, expect, test, vi } from "vitest";

import {
  createInterest,
  findInterestById,
  findInterestsForAdmin,
  isUniqueInterestNameError,
  updateInterestName,
} from "../repositories/interestRepository";
import {
  createInterestForAdmin,
  listInterestsForAdmin,
  updateInterestForAdmin,
} from "./interestService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/interestRepository", () => ({
  countInterestUsers: vi.fn(),
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
