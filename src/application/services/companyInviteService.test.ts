import { createHash } from "node:crypto";
import { beforeEach, expect, test, vi } from "vitest";

import { updateCompanyInviteCodeHash } from "../repositories/companyInviteRepository";
import { findCompanyById } from "../repositories/companyRepository";
import { rotateCompanyInviteCode } from "./companyInviteService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/companyRepository", () => ({
  findCompanyById: vi.fn(),
}));
vi.mock("../repositories/companyInviteRepository", () => ({
  updateCompanyInviteCodeHash: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("rejects unknown companies with 404", async () => {
  vi.mocked(findCompanyById).mockResolvedValue(null);
  await expect(rotateCompanyInviteCode("missing")).rejects.toMatchObject({
    status: 404,
  });
  expect(updateCompanyInviteCodeHash).not.toHaveBeenCalled();
});

test("stores sha256 hash and returns plaintext invite code", async () => {
  vi.mocked(findCompanyById).mockResolvedValue({ id: "company-1" } as never);
  const now = new Date("2026-11-16T23:30:00.000Z");
  vi.mocked(updateCompanyInviteCodeHash).mockResolvedValue({
    employeeInviteCodeUpdatedAt: now,
  });

  const result = await rotateCompanyInviteCode("company-1");
  expect(result.code).toMatch(/^fs_emp_[0-9a-f]{40}$/u);
  expect(result.updatedAt).toBe(now.toISOString());

  const expectedHash = createHash("sha256")
    .update(result.code, "utf8")
    .digest("hex");
  expect(updateCompanyInviteCodeHash).toHaveBeenCalledWith(
    "company-1",
    expectedHash,
    expect.any(Date)
  );
});
