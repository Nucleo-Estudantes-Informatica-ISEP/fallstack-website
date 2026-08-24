import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let interests: { name: string }[] = [];

  return {
    reset() {
      interests = [];
    },

    companyFindUnique: vi.fn(async () => ({
      interests,
    })),

    companyUpdate: vi.fn(
      async ({
        data,
      }: {
        data: { interests: { set: { name: string }[] } };
      }) => {
        interests = data.interests.set;
        return {};
      }
    ),
  };
});

vi.mock("server-only", () => ({}));

vi.mock("./database", () => ({
  default: {
    company: {
      findUnique: mocks.companyFindUnique,
      update: mocks.companyUpdate,
    },
  },
}));

import {
  findCompanyInterests,
  setCompanyInterestsByName,
} from "./companyRepository";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reset();
});

test("employees sharing a company read and update the same company interests", async () => {
  const companyId = "company-1";

  // Employee A updates the shared company interests.
  await setCompanyInterestsByName(companyId, ["AI", "Web"]);

  // Employee B reads interests for the same company.
  await expect(findCompanyInterests(companyId)).resolves.toEqual([
    "AI",
    "Web",
  ]);

  // Employee B updates that same shared state.
  await setCompanyInterestsByName(companyId, ["Cloud"]);

  // Employee A immediately sees the updated company-wide value.
  await expect(findCompanyInterests(companyId)).resolves.toEqual(["Cloud"]);

  expect(mocks.companyUpdate).toHaveBeenCalledTimes(2);
});