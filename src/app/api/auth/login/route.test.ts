// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, expect, test, vi } from "vitest";

import { oidcCookieNames } from "@/application/services/zitadelAuthService";

import { GET } from "./route";

vi.mock("server-only", () => ({}));

const issuer = "https://auth.example.test";

const mockEnv = vi.hoisted(() => ({
  NODE_ENV: "test",
  AUTH_ISSUER_URL: "https://auth.example.test",
  AUTH_CLIENT_ID: "fixture-client",
  AUTH_REDIRECT_URI: "https://fallstack.example.test/api/auth/callback/zitadel",
  AUTH_SCOPES: "openid email",
  EVENT_MODE: "active",
}));
vi.mock("@/config/env.server", () => ({ serverEnv: mockEnv }));

afterEach(() => {
  mockEnv.EVENT_MODE = "active";
  vi.unstubAllGlobals();
});

test("requests registration with PKCE and keeps the event profile as the return destination", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        issuer,
        authorization_endpoint: issuer + "/authorize",
        token_endpoint: issuer + "/token",
        userinfo_endpoint: issuer + "/user",
        jwks_uri: issuer + "/keys",
      })
    )
  );

  const response = await GET(
    new NextRequest(
      "https://fallstack.example.test/api/auth/login?register=1&next=/ignored"
    )
  );
  const authorization = new URL(response.headers.get("location")!);
  expect(authorization.origin).toBe(issuer);
  expect(authorization.searchParams.get("prompt")).toBe("create");
  expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
  expect(response.cookies.get(oidcCookieNames.next)?.value).toBe("/signup");

  const signIn = await GET(
    new NextRequest(
      "https://fallstack.example.test/api/auth/login?next=/attendance/scan"
    )
  );
  const signInUrl = new URL(signIn.headers.get("location")!);
  expect(signInUrl.searchParams.has("prompt")).toBe(false);
  expect(signIn.cookies.get(oidcCookieNames.next)?.value).toBe(
    "/attendance/scan"
  );
});

test("does not start event registration during the offseason", async () => {
  mockEnv.EVENT_MODE = "offseason";
  const response = await GET(
    new NextRequest("https://fallstack.example.test/api/auth/login?register=1")
  );
  expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
  expect(response.cookies.get(oidcCookieNames.state)).toBeUndefined();
});
