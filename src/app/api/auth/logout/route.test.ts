import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import config from "@/config";
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

beforeEach(() => vi.resetAllMocks());

function post(cookieValue?: string, scope?: string, origin?: string) {
  const headers = new Headers();
  if (cookieValue) {
    headers.set("origin", new URL(process.env.AUTH_REDIRECT_URI!).origin);
    headers.set("cookie", `${config.cookies.auth.name}=${cookieValue}`);
  }
  if (origin) headers.set("origin", origin);
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

test("distinguishes older shared-logout sessions without an ID token", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "legacy-user",
    email: "legacy@example.test",
    admin: false,
    employee: false,
  });
  const response = await post("legacy-session", "shared");

  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    code: "SHARED_SIGN_OUT_REAUTH_REQUIRED",
  });
  expect(response.headers.has("set-cookie")).toBe(false);
  expect(getLogoutUrl).not.toHaveBeenCalled();
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

test("clears the local cookie when the provider is unavailable", async () => {
  vi.mocked(getLogoutUrl).mockRejectedValueOnce(
    new Error("provider unavailable")
  );
  const response = await post("signed-session");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    logoutUrl: process.env.AUTH_POST_LOGOUT_REDIRECT_URI,
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0|expires=/i);
});

test("shared logout keeps the cookie when issuer discovery throws", async () => {
  vi.mocked(verifyAppSession).mockReturnValue({
    sub: "user",
    email: "user@example.test",
    idToken: "fixture-id-token",
    admin: false,
    employee: false,
  });
  vi.mocked(getLogoutUrl).mockRejectedValueOnce(
    new Error("provider unavailable")
  );
  const response = await post("signed-session", "shared");
  expect(response.status).toBe(503);
  expect(response.headers.has("set-cookie")).toBe(false);
});

test("rejects foreign-origin logout requests without clearing the session", async () => {
  const response = await post(
    "signed-session",
    "app",
    "https://foreign.example.test"
  );
  expect(response.status).toBe(403);
  expect(response.headers.has("set-cookie")).toBe(false);
  expect(getLogoutUrl).not.toHaveBeenCalled();
});
