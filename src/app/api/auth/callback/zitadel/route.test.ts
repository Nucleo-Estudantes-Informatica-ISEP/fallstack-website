// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import {
  AuthNeiEmailVerificationRequired,
  completeAuthorizationCode,
  oidcCookieNames,
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

async function callback(query: string, pending = true) {
  const cookies = [
    [oidcCookieNames.state, "current-request"],
    [oidcCookieNames.nonce, "fixture-nonce"],
    [oidcCookieNames.verifier, "fixture-verifier"],
  ];
  const response = await GET(
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

test("asks for verification only when the provider confirmed the matching email is unverified", async () => {
  vi.mocked(completeAuthorizationCode).mockRejectedValueOnce(
    new AuthNeiEmailVerificationRequired()
  );
  await expect(
    callback("state=current-request&code=fixture-code")
  ).resolves.toBe("auth-verification-required");
});
