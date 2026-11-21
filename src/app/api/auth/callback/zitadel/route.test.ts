// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { consumeOidcRestart } from "@/application/repositories/oidcRestartRepository";
import {
  AuthNeiEmailVerificationRequired,
  completeAuthorizationCode,
  oidcCookieNames,
  oidcRestartCookieName,
  verifyEmailCookieName,
} from "@/application/services/zitadelAuthService";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/application/repositories/oidcRestartRepository", () => ({
  consumeOidcRestart: vi.fn(),
}));
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
    [oidcCookieNames.next, encodeURIComponent("/signup?lang=en")],
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
  expect(destination.searchParams.get("next")).toBe("/signup?lang=en");
  expect(
    JSON.parse(response.cookies.get(verifyEmailCookieName)!.value).next
  ).toBeUndefined();
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

test("recovers a long interrupted destination from the bounded restart cookie", async () => {
  const state = "b".repeat(43);
  const destination = "/event?filter=" + "x".repeat(1800);
  const cookie = oidcRestartCookieName(state)!;
  const response = await GET(
    new NextRequest(
      `https://fallstack.example.test/api/auth/callback/zitadel?state=${state}&code=fixture`,
      { headers: { cookie: `${cookie}=${encodeURIComponent(destination)}` } }
    )
  );
  expect(
    new URL(response.headers.get("location")!).searchParams.get("next")
  ).toBe(destination);
});

test("recovers an oversized interrupted destination from shared storage", async () => {
  const state = "c".repeat(43);
  const destination = "/event?filter=" + "x".repeat(5000);
  vi.mocked(consumeOidcRestart).mockResolvedValueOnce(destination);
  const response = await GET(
    new NextRequest(
      `https://fallstack.example.test/api/auth/callback/zitadel?state=${state}&code=fixture`,
      {
        headers: {
          cookie: `${oidcRestartCookieName(state)}=stored:${"z".repeat(43)}`,
        },
      }
    )
  );
  expect(consumeOidcRestart).toHaveBeenCalledWith("z".repeat(43));
  expect(
    new URL(response.headers.get("location")!).searchParams.get("next")
  ).toBe(destination);
});

test("keeps a stored destination through email verification", async () => {
  const state = "d".repeat(43);
  const destination = "/event?filter=" + "x".repeat(5000);
  vi.mocked(consumeOidcRestart).mockResolvedValueOnce(destination);
  vi.mocked(completeAuthorizationCode).mockRejectedValueOnce(
    new AuthNeiEmailVerificationRequired("fixture@example.test")
  );
  const cookies = [
    `${oidcCookieNames.state}=${state}`,
    `${oidcCookieNames.nonce}=nonce`,
    `${oidcCookieNames.verifier}=verifier`,
    `${oidcRestartCookieName(state)}=stored:${"z".repeat(43)}`,
  ];
  const response = await GET(
    new NextRequest(
      `https://fallstack.example.test/api/auth/callback/zitadel?state=${state}&code=fixture`,
      { headers: { cookie: cookies.join("; ") } }
    )
  );
  expect(
    new URL(response.headers.get("location")!).searchParams.get("next")
  ).toBe(destination);
  expect(
    JSON.parse(response.cookies.get(verifyEmailCookieName)!.value)
  ).toEqual({ loginHint: "fixture@example.test" });
});

test("does not load a destination from the OIDC state alone", async () => {
  const state = "e".repeat(43);
  const response = await GET(
    new NextRequest(
      `https://fallstack.example.test/api/auth/callback/zitadel?state=${state}&code=fixture`,
      { headers: { cookie: `${oidcRestartCookieName(state)}=stored` } }
    )
  );
  expect(consumeOidcRestart).not.toHaveBeenCalled();
  expect(
    new URL(response.headers.get("location")!).searchParams.has("next")
  ).toBe(false);
});
