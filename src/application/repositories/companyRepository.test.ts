import { beforeEach, expect, test, vi } from "vitest";

import { findCompanyInterests } from "./companyRepository";

const mocks = vi.hoisted(() => ({
  companyFindUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("./database", () => ({
  default: {
    company: {
      findUnique: mocks.companyFindUnique,
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("reads interests directly from the company", async () => {
  mocks.companyFindUnique.mockResolvedValue({
    interests: [{ name: "AI" }, { name: "Web" }],
  });

  await expect(findCompanyInterests("company-1")).resolves.toEqual([
    "AI",
    "Web",
  ]);

  expect(mocks.companyFindUnique).toHaveBeenCalledWith({
    where: { id: "company-1" },
    select: {
      interests: {
        select: { name: true },
      },
    },
  });
});

test("returns an empty list when the company does not exist", async () => {
  mocks.companyFindUnique.mockResolvedValue(null);

  await expect(findCompanyInterests("missing")).resolves.toEqual([]);
});
