import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import config from "@/config";
import { serverEnv } from "@/config/env.server";
import {
  getLogoutUrl,
  verifyAppSession,
} from "@/application/services/zitadelAuthService";

import { POST } from "./route";

vi.mock("server-only", () => ({}));

vi.mock("@/application/services/sessionService", () => ({
  default: vi.fn(),
}));

vi.mock("@/application/services/zitadelAuthService", () => ({
  getLogoutUrl: vi.fn(),
  verifyAppSession: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

function post(cookieValue?: string, scope?: string) {
  const headers = new Headers();
  if (cookieValue) {
    headers.set("cookie", `${config.cookies.auth.name}=${cookieValue}`);
  }
  const url = new URL("http://localhost/api/auth/logout");
  if (scope) url.searchParams.set("scope", scope);
  const request = new NextRequest(url, {
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

  const response = await post("valid-token", "shared");
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

test("app-only logout clears the app cookie and never contacts the issuer", async () => {
  const response = await post("valid-token", "app");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ logoutUrl: "/" });
  expect(response.headers.get("set-cookie")).toContain(
    config.cookies.auth.name
  );
  expect(getLogoutUrl).not.toHaveBeenCalled();
});

test("unknown sign-out scopes leave the session untouched", async () => {
  const response = await post("valid-token", "unknown");

  expect(response.status).toBe(400);
  expect(response.headers.has("set-cookie")).toBe(false);
  expect(getLogoutUrl).not.toHaveBeenCalled();
});

test("shared logout leaves the cookie available for retry if AuthNEI is unavailable", async () => {
  vi.mocked(getLogoutUrl).mockResolvedValue(
    serverEnv.AUTH_POST_LOGOUT_REDIRECT_URI
  );
  const response = await post(undefined, "shared");

  expect(response.status).toBe(503);
  expect(response.headers.has("set-cookie")).toBe(false);
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
