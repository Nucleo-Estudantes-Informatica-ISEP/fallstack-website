import { expect, test, vi } from "vitest";

import { countActiveCompanies } from "./companyRepository";
import prisma from "./database";

vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({
  default: { company: { count: vi.fn() } },
}));

test("countActiveCompanies excludes deactivated companies", async () => {
  vi.mocked(prisma.company.count).mockResolvedValue(2 as never);

  await expect(countActiveCompanies()).resolves.toBe(2);
  expect(prisma.company.count).toHaveBeenCalledWith({
    where: { active: true },
  });
});
