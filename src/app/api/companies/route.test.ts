import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import {
  getCompanies,
  registerCompany,
} from "@/application/services/companyService";
import getServerSession from "@/application/services/sessionService";

import { GET, POST } from "./route";

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
  registerCompany: vi.fn(),
  getCompanies: vi.fn(),
}));

vi.mock("@/application/dto/companyDto", () => ({
  toCompanyDto: (company: unknown) => company,
}));

const session = {
  id: "company-user-id",
  email: "company@example.test",
  authName: "Empresa Teste",
  role: "EMPLOYEE",
  adminRole: null,
  student: null,
};

const validCompany = {
  name: "Empresa Teste",
  rankId: "550e8400-e29b-41d4-a716-446655440000",
  avatarUrl: "https://example.com/logo.png",
};

function post(body: unknown) {
  const request = new NextRequest("http://localhost/api/companies", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return POST(request, { params: Promise.resolve({}) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockEnv.EVENT_MODE = "active";

  vi.mocked(getServerSession).mockResolvedValue(session as never);

  vi.mocked(registerCompany).mockResolvedValue({
    id: "company-id",
    ...validCompany,
  } as never);

  vi.mocked(getCompanies).mockResolvedValue([]);
});

test("rejects new company registrations during offseason", async () => {
  mockEnv.EVENT_MODE = "offseason";

  const response = await post(validCompany);

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    error: "As inscrições estão encerradas.",
  });

  expect(registerCompany).not.toHaveBeenCalled();
});

test("allows company registrations in active mode", async () => {
  const response = await post(validCompany);

  expect(response.status).toBe(201);
  expect(registerCompany).toHaveBeenCalledWith({
    userId: session.id,
    ...validCompany,
  });
});

test("does not block the admin company listing during offseason", async () => {
  mockEnv.EVENT_MODE = "offseason";

  vi.mocked(getServerSession).mockResolvedValue({
    ...session,
    role: "ADMIN",
    adminRole: "ADMIN",
  } as never);

  const request = new NextRequest("http://localhost/api/companies");

  const response = await GET(request, {
    params: Promise.resolve({}),
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
  expect(getCompanies).toHaveBeenCalledOnce();
});
