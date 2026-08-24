import { beforeEach, expect, test, vi } from "vitest";

import {
  deleteInterest,
  findInterestById,
} from "../repositories/interestRepository";
import { deleteInterestForAdmin } from "./interestService";

vi.mock("server-only", () => ({}));

vi.mock("../repositories/interestRepository", () => ({
  countInterestsForAdmin: vi.fn(),
  createInterest: vi.fn(),
  deleteInterest: vi.fn(),
  findInterestById: vi.fn(),
  findInterests: vi.fn(),
  findInterestsForAdmin: vi.fn(),
  updateInterestName: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("deletes an existing interest without blocking based on usage", async () => {
  vi.mocked(findInterestById).mockResolvedValue({
    id: "interest-1",
    name: "AI",
  } as never);

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
