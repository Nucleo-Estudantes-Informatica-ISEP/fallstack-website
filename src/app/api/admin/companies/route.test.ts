import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { createCompanyForAdmin } from "@/application/services/companyService";
import getServerSession from "@/application/services/sessionService";

import { POST } from "./route";

const mockEnv = vi.hoisted(() => ({
  EVENT_MODE: "active" as "active" | "offseason",
}));

vi.mock("server-only", () => ({}));
vi.mock("@/config/env.server", () => ({
  serverEnv: mockEnv,
}));
vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));
vi.mock("@/application/services/companyService", () => ({
  createCompanyForAdmin: vi.fn(),
  listCompaniesForAdmin: vi.fn(),
}));
vi.mock("@/application/dto/companyDto", () => ({
  toAdminCompanyDto: (company: unknown) => company,
}));

const fields = {
  name: "Empresa Teste",
  rankId: "123e4567-e89b-42d3-a456-426614174000",
};

function post() {
  return POST(
    new NextRequest("http://localhost/api/admin/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fields),
    }),
    { params: Promise.resolve({}) }
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mockEnv.EVENT_MODE = "active";
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: "ADMIN",
  } as never);
  vi.mocked(createCompanyForAdmin).mockResolvedValue({
    id: "company-id",
  } as never);
});

test("active mode allows admin company creation", async () => {
  const response = await post();

  expect(response.status).toBe(201);
  expect(createCompanyForAdmin).toHaveBeenCalledWith(fields);
});

test("offseason blocks admin company creation", async () => {
  mockEnv.EVENT_MODE = "offseason";

  const response = await post();

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    error: "As inscrições estão encerradas.",
  });
  expect(createCompanyForAdmin).not.toHaveBeenCalled();
});

test("unauthenticated requests cannot create companies", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);

  expect((await post()).status).toBe(401);
  expect(createCompanyForAdmin).not.toHaveBeenCalled();
});

test("non-admin users cannot create companies", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    adminRole: null,
  } as never);

  expect((await post()).status).toBe(403);
  expect(createCompanyForAdmin).not.toHaveBeenCalled();
});
