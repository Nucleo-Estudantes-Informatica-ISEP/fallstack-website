// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import {
  AuthNeiEmailVerificationRequired,
  completeAuthorizationCode,
  oidcCookieNames,
  oidcRestartCookieName,
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

test.each([false, true])(
  "recovers only the interrupted attempt’s destination when another attempt is pending: %s",
  async (anotherAttemptIsPending) => {
    const state = "a".repeat(43);
    const destination = "/event/en?section=schedule";
    const restartCookie = oidcRestartCookieName(state)!;
    const items = [`${restartCookie}=${encodeURIComponent(destination)}`];
    if (anotherAttemptIsPending) {
      items.push(
        `${oidcCookieNames.state}=new-attempt`,
        `${oidcCookieNames.next}=%2Fdashboard`
      );
    }
    const request = new NextRequest(
      `https://fallstack.example.test/api/auth/callback/zitadel?state=${state}&code=fixture-code`,
      { headers: { cookie: items.join("; ") } }
    );

    const response = await GET(request);
    const target = new URL(response.headers.get("location")!);

    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("error")).toBe("auth-expired");
    expect(target.searchParams.get("next")).toBe(destination);
    expect(response.cookies.get(oidcCookieNames.state)).toBeUndefined();
    expect(response.cookies.get(oidcCookieNames.next)).toBeUndefined();
    expect(response.cookies.get(restartCookie)?.maxAge).toBe(0);
    expect(completeAuthorizationCode).not.toHaveBeenCalled();
  }
);
