import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

import config from "@/config";
import {
  getLogoutUrl,
  verifyAppSession,
} from "@/application/services/zitadelAuthService";

import { POST } from "./route";

vi.mock("server-only", () => ({}));

vi.mock("@/application/services/zitadelAuthService", () => ({
  getLogoutUrl: vi.fn(),
  verifyAppSession: vi.fn(),
}));

function post(cookieValue?: string) {
  const headers = new Headers();
  if (cookieValue) {
    headers.set("cookie", `${config.cookies.auth.name}=${cookieValue}`);
  }
  const request = new NextRequest("http://localhost/api/auth/logout", {
    method: "POST",
    headers,
  });

  return POST(request, { params: Promise.resolve({}) });
}

test("passes idTokenHint and loginName from verified session to getLogoutUrl and clears the cookie", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "user-123",
    email: "user@example.com",
    loginName: "user@auth.example.com",
    idToken: "jwt.id.token",
    employee: false,
    admin: false,
  });
  vi.mocked(getLogoutUrl).mockResolvedValue(
    "https://auth.example.com/logout?id_token_hint=jwt.id.token"
  );

  const response = await post("valid-token");
  expect(response.status).toBe(200);

  const body = (await response.json()) as { logoutUrl: string };
  expect(body.logoutUrl).toBe(
    "https://auth.example.com/logout?id_token_hint=jwt.id.token"
  );
  expect(getLogoutUrl).toHaveBeenCalledWith({
    idTokenHint: "jwt.id.token",
    loginName: "user@auth.example.com",
  });

  const cookieHeader = response.headers.get("set-cookie");
  expect(cookieHeader).toContain(config.cookies.auth.name);
  expect(cookieHeader).toMatch(/Max-Age=0|expires=/i);
});

test("handles logout when no session cookie is present", async () => {
  vi.mocked(verifyAppSession).mockReturnValue(null);
  vi.mocked(getLogoutUrl).mockResolvedValue("http://localhost:3000");

  const response = await post();
  expect(response.status).toBe(200);

  const body = (await response.json()) as { logoutUrl: string };
  expect(body.logoutUrl).toBe("http://localhost:3000");
  expect(getLogoutUrl).toHaveBeenCalledWith({
    idTokenHint: undefined,
    loginName: undefined,
  });
});
