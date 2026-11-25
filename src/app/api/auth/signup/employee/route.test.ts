import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { signUpEmployee } from "@/application/services/authApplicationService";
import { checkRateLimit } from "@/application/services/rateLimitService";
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

vi.mock("@/application/services/rateLimitService", () => ({
  checkRateLimit: vi.fn(),
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
  vi.mocked(checkRateLimit).mockResolvedValue({ status: "allowed" });
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

test("employee signup propagates only verified membership and attendance expiry", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    id: "employee",
    zitadelUserId: "subject",
    email: "employee@example.org",
    neiMember: true,
    attendanceExpiresAt: 123000,
  } as never);
  vi.mocked(signUpEmployee).mockResolvedValue("signed-session");
  const response = await POST(
    new NextRequest("http://localhost/api/auth/signup/employee", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Employee",
        companyCode: "fs_emp_12345678",
        isNeiMember: false,
        attendanceExpiresAt: 999999,
      }),
    }),
    { params: Promise.resolve({}) }
  );
  expect(response.status).toBe(201);
  expect(signUpEmployee).toHaveBeenCalledWith(
    expect.objectContaining({ isNeiMember: true, attendanceExpiresAt: 123000 })
  );
  expect(response.headers.get("set-cookie")).toContain("signed-session");
});

test("rate limits an account before checking its company code", async () => {
  vi.mocked(checkRateLimit).mockResolvedValue({
    status: "limited",
    retryAfterMs: 5000,
  });

  const response = await post(validEmployee);

  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("5");
  expect(checkRateLimit).toHaveBeenCalledWith("employee_signup", session.id, {
    max: 10,
    windowMs: 60_000,
  });
  expect(signUpEmployee).not.toHaveBeenCalled();
});
