import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { signUpEmployee } from "@/application/services/authApplicationService";
import getServerSession from "@/application/services/sessionService";

import { POST } from "./route";

const mockEnv = vi.hoisted(() => ({
  EVENT_MODE: "active" as "active" | "offseason",
  NODE_ENV: "test",
}));

vi.mock("server-only", () => ({}));

vi.mock("@/config/env.server", () => ({
  serverEnv: mockEnv,
}));

vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));

vi.mock("@/application/services/authApplicationService", () => ({
  signUpEmployee: vi.fn(),
}));

const session = {
  id: "employee-id",
  zitadelUserId: "zitadel-123",
  email: "employee@example.com",
  role: "EMPLOYEE",
};

const validEmployee = {
  name: "Maria Silva",
  companyCode: "COMPANY123",
  linkedin: "https://www.linkedin.com/in/maria-silva",
};

function post(body: unknown) {
  const request = new NextRequest("http://localhost/api/auth/signup/employee", {
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
});

test("rejects employee registration during offseason", async () => {
  mockEnv.EVENT_MODE = "offseason";

  const response = await post(validEmployee);

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    error: "As inscrições estão encerradas.",
  });

  expect(signUpEmployee).not.toHaveBeenCalled();
});
