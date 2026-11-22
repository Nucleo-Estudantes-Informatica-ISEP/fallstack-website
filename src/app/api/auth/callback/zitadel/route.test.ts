// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import {
  AuthNeiEmailVerificationRequired,
  completeAuthorizationCode,
  oidcCookieNames,
  verifyEmailCookieName,
} from "@/application/services/zitadelAuthService";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env.server", () => ({
  serverEnv: {
    AUTH_POST_LOGOUT_REDIRECT_URI: "https://fallstack.example.test/",
    NODE_ENV: "test",
  },
}));
vi.mock("@/application/services/authApplicationService", () => ({
  completeZitadelSignIn: vi.fn(),
}));
vi.mock("@/application/services/zitadelAuthService", async (original) => ({
  ...(await original<
    typeof import("@/application/services/zitadelAuthService")
  >()),
  completeAuthorizationCode: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

async function callbackResponse(query: string, pending = true) {
  const cookies = [
    [oidcCookieNames.state, "current-request"],
    [oidcCookieNames.nonce, "fixture-nonce"],
    [oidcCookieNames.verifier, "fixture-verifier"],
  ];
  return GET(
    new NextRequest(
      `https://fallstack.example.test/api/auth/callback/zitadel?${query}`,
      {
        headers: pending
          ? {
              cookie: cookies
                .map(([name, value]) => `${name}=${value}`)
                .join("; "),
            }
          : undefined,
      }
    )
  );
}

async function callback(query: string, pending = true) {
  const response = await callbackResponse(query, pending);
  return new URL(response.headers.get("location")!).searchParams.get("error");
}

test("distinguishes cancelled, expired and unexpected callbacks without exposing issuer text", async () => {
  await expect(
    callback("state=current-request&error=access_denied")
  ).resolves.toBe("auth-cancelled");
  await expect(
    callback("state=current-request&code=fixture-code", false)
  ).resolves.toBe("auth-expired");
  await expect(
    callback("state=current-request&error=server_error")
  ).resolves.toBe("auth-code-error");
  expect(completeAuthorizationCode).not.toHaveBeenCalled();
});

test("preserves the active transaction when an older callback arrives", async () => {
  const stale = await callbackResponse("state=older-request&code=fixture-code");

  expect(
    new URL(stale.headers.get("location")!).searchParams.get("error")
  ).toBe("auth-expired");
  expect(stale.headers.get("set-cookie")).toBeNull();
  expect(completeAuthorizationCode).not.toHaveBeenCalled();

  const cancelled = await callbackResponse(
    "state=current-request&error=access_denied"
  );
  expect(cancelled.cookies.get(oidcCookieNames.state)?.value).toBe("");
});

test("asks for verification only when the provider confirmed the matching email is unverified", async () => {
  vi.mocked(completeAuthorizationCode).mockRejectedValueOnce(
    new AuthNeiEmailVerificationRequired("fixture@example.test")
  );
  const response = await callbackResponse(
    "state=current-request&code=fixture-code"
  );
  const destination = new URL(response.headers.get("location")!);
  expect(destination.searchParams.get("error")).toBe(
    "auth-verification-required"
  );
  expect(destination.searchParams.has("loginHint")).toBe(false);
  expect(response.cookies.get(verifyEmailCookieName)).toMatchObject({
    httpOnly: true,
    sameSite: "lax",
  });
});
