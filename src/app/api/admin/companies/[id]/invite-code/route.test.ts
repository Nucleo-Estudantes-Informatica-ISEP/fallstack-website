import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { rotateCompanyInviteCode } from "@/application/services/companyInviteService";
import getServerSession from "@/application/services/sessionService";

import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/companyInviteService", () => ({
  rotateCompanyInviteCode: vi.fn(),
}));

function post(id = "company-1") {
  return POST(
    new NextRequest(
      `http://localhost/api/admin/companies/${id}/invite-code`,
      { method: "POST" }
    ),
    { params: Promise.resolve({ id }) }
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

test("rejects non-admin users", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: null,
    role: "EMPLOYEE",
  } as never);

  const response = await post();
  expect(response.status).toBe(403);
  expect(rotateCompanyInviteCode).not.toHaveBeenCalled();
});

test("generates a company invite code for admins", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: "ADMIN",
  } as never);
  vi.mocked(rotateCompanyInviteCode).mockResolvedValue({
    code: "fs_emp_1234",
    updatedAt: "2026-11-16T23:30:00.000Z",
  });

  const response = await post("company-1");
  expect(response.status).toBe(201);
  expect(rotateCompanyInviteCode).toHaveBeenCalledWith("company-1");
  await expect(response.json()).resolves.toEqual({
    code: "fs_emp_1234",
    updatedAt: "2026-11-16T23:30:00.000Z",
  });
});
