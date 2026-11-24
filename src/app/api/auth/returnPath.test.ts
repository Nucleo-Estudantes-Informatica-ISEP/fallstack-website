// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, expect, test, vi } from "vitest";

import config from "@/config";
import { completeZitadelSignIn } from "@/application/services/authApplicationService";
import { oidcCookieNames } from "@/application/services/zitadelAuthService";

import { GET as callback } from "./callback/zitadel/route";
import { GET as login } from "./login/route";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env.server", () => ({
  serverEnv: {
    AUTH_ISSUER_URL: "https://auth.example.test",
    AUTH_CLIENT_ID: "test-client",
    AUTH_REDIRECT_URI: "https://app.example.test/api/auth/callback/zitadel",
    AUTH_POST_LOGOUT_REDIRECT_URI: "https://app.example.test",
    AUTH_SCOPES: "openid email profile",
  },
}));
vi.mock("@/application/services/authApplicationService", () => ({
  completeZitadelSignIn: vi.fn(async ({ fallback }) => fallback),
}));
vi.mock(
  "@/application/services/zitadelAuthService",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/application/services/zitadelAuthService")
    >()),
    completeAuthorizationCode: vi.fn(async () => ({ sub: "test-account" })),
    signAppSession: () => "test-session",
  })
);

afterEach(() => vi.unstubAllGlobals());

test("stores only an in-app return path when login receives an external destination", async () => {
  const issuer = "https://auth.example.test";
  vi.stubGlobal("fetch", async () =>
    Response.json({
      issuer,
      authorization_endpoint: issuer + "/authorize",
      token_endpoint: issuer + "/token",
      userinfo_endpoint: issuer + "/userinfo",
      jwks_uri: issuer + "/keys",
    })
  );

  const response = await login(
    new NextRequest(
      "https://app.example.test/api/auth/login?next=https://external.example.test"
    )
  );

  expect(response.status).toBe(307);
  expect(response.cookies.get(oidcCookieNames.next)?.value).toBe("/");
});

test("uses the app root when the successful callback receives an external return cookie", async () => {
  const request = new NextRequest(
    "https://app.example.test/api/auth/callback/zitadel?state=fixture&code=fixture",
    {
      headers: {
        cookie: [
          `${oidcCookieNames.state}=fixture`,
          `${oidcCookieNames.nonce}=fixture`,
          `${oidcCookieNames.verifier}=fixture`,
          `${oidcCookieNames.next}=${encodeURIComponent("//external.example.test")}`,
        ].join("; "),
      },
    }
  );

  const response = await callback(request);

  expect(response.headers.get("location")).toBe("https://app.example.test/");
  expect(completeZitadelSignIn).toHaveBeenCalledWith(
    expect.objectContaining({ fallback: "/" })
  );
  expect(response.cookies.get(config.cookies.auth.name)?.value).toBe(
    "test-session"
  );
});
