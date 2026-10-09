import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { HttpError } from "@/types/HttpError";
import getServerSession from "@/application/services/sessionService";

import { GET, POST } from "./route";

const { createSaveUrlMock, isConfiguredMock } = vi.hoisted(() => ({
  createSaveUrlMock: vi.fn(),
  isConfiguredMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/application/services/googleWalletService", () => ({
  createGoogleWalletSaveUrl: createSaveUrlMock,
  isGoogleWalletConfigured: isConfiguredMock,
}));
vi.mock("@/application/services/sessionService", () => ({ default: vi.fn() }));

const student = {
  id: "11111111-2222-3333-4444-555555555555",
  code: "AB12",
  name: "Student Example",
};
const context = { params: Promise.resolve({}) };

beforeEach(() => {
  createSaveUrlMock.mockReset();
  isConfiguredMock.mockReset();
  vi.mocked(getServerSession).mockResolvedValue({
    role: "STUDENT",
    student,
  } as never);
});

test("reports Wallet availability from server configuration", async () => {
  isConfiguredMock.mockReturnValue(false);
  const response = await GET(
    new NextRequest("https://fallstack.pt/api/wallet"),
    context
  );
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ enabled: false });
});

test("builds the pass only from the authenticated student's session data", async () => {
  createSaveUrlMock.mockResolvedValue(
    "https://pay.google.com/gp/v/save/signed-jwt"
  );

  const response = await POST(
    new NextRequest("https://fallstack.pt/api/wallet", {
      method: "POST",
      body: JSON.stringify({ id: "other-student" }),
    }),
    context
  );
  expect(response.status).toBe(200);

  expect(createSaveUrlMock).toHaveBeenCalledWith({
    id: "11111111-2222-3333-4444-555555555555",
    code: "AB12",
    name: "Student Example",
  });
  await expect(response.json()).resolves.toEqual({
    url: "https://pay.google.com/gp/v/save/signed-jwt",
  });
});

test("disabled Wallet issuance preserves the 503 JSON error contract", async () => {
  createSaveUrlMock.mockRejectedValue(
    new HttpError("Google Wallet is not configured", 503)
  );
  const response = await POST(
    new NextRequest("https://fallstack.pt/api/wallet", { method: "POST" }),
    context
  );
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toEqual({
    error: "Google Wallet is not configured",
  });
});

test("deleted sessions return 401 before reaching Wallet issuance", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  const response = await POST(
    new NextRequest("https://fallstack.pt/api/wallet", { method: "POST" }),
    context
  );
  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  expect(createSaveUrlMock).not.toHaveBeenCalled();
});
