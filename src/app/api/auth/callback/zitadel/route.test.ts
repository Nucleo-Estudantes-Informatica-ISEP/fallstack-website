// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import config from "@/config";
import { consumeOidcRestart } from "@/application/repositories/oidcRestartRepository";
import { completeZitadelSignIn } from "@/application/services/authApplicationService";
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
  signAppSession: () => "fixture-session",
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
    vi.mocked(consumeOidcRestart).mockResolvedValueOnce(destination);
    const items = [`${restartCookie}=stored:1795219200000:${"z".repeat(43)}`];
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

test("ignores a raw destination in the recovery cookie", async () => {
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
  ).toBeNull();
  expect(consumeOidcRestart).not.toHaveBeenCalled();
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
          cookie: `${oidcRestartCookieName(state)}=stored:1795219200000:${"z".repeat(43)}`,
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

test("keeps the callback retryable when reading its destination fails", async () => {
  const state = "a".repeat(43);
  vi.mocked(consumeOidcRestart).mockRejectedValueOnce(
    new Error("store unavailable")
  );
  const response = await GET(
    new NextRequest(
      `https://fallstack.example.test/api/auth/callback/zitadel?state=${state}&code=fixture-code`,
      {
        headers: {
          cookie: `${oidcRestartCookieName(state)}=stored:${"z".repeat(43)}`,
        },
      }
    )
  );
  expect(response.status).toBe(503);
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(await response.text()).toContain("Tentar novamente");
  expect(completeAuthorizationCode).not.toHaveBeenCalled();
});

test("clears the consumed recovery cookie after establishing the app session", async () => {
  const state = "f".repeat(43);
  const recoveryCookie = oidcRestartCookieName(state)!;
  vi.mocked(consumeOidcRestart).mockResolvedValueOnce("/signup");
  vi.mocked(completeZitadelSignIn).mockResolvedValueOnce("/signup");
  const cookies = [
    `${oidcCookieNames.state}=${state}`,
    `${oidcCookieNames.nonce}=nonce`,
    `${oidcCookieNames.verifier}=verifier`,
    `${recoveryCookie}=stored:1795219200000:${"z".repeat(43)}`,
  ];

  const response = await GET(
    new NextRequest(
      `https://fallstack.example.test/api/auth/callback/zitadel?state=${state}&code=fixture`,
      { headers: { cookie: cookies.join("; ") } }
    )
  );

  expect(response.headers.get("location")).toBe(
    "https://fallstack.example.test/signup"
  );
  expect(response.cookies.get(config.cookies.auth.name)?.value).toBe(
    "fixture-session"
  );
  expect(response.cookies.get(recoveryCookie)).toMatchObject({
    path: "/api/auth",
    maxAge: 0,
  });
});
