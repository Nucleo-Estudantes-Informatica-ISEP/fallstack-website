import jwt from "jsonwebtoken";
import { afterEach, expect, test, vi } from "vitest";

import {
  getLogoutUrl,
  mapIdentityRoles,
  signAppSession,
  verifyAppSession,
} from "./zitadelAuthService";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env.server", () => ({
  serverEnv: {
    AUTH_SECRET: "a-secret-long-enough-to-sign-test-sessions",
    AUTH_ISSUER_URL: "https://auth.example.org",
    AUTH_CLIENT_ID: "client",
    AUTH_POST_LOGOUT_REDIRECT_URI: "https://app.example.org",
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("uses the verified session login name as the logout hint", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        issuer: "https://auth.example.org",
        authorization_endpoint: "https://auth.example.org/authorize",
        token_endpoint: "https://auth.example.org/token",
        userinfo_endpoint: "https://auth.example.org/userinfo",
        jwks_uri: "https://auth.example.org/keys",
        end_session_endpoint: "https://auth.example.org/logout",
      }),
    })
  );
  const token = signAppSession({
    sub: "user",
    email: "user@example.org",
    loginName: "user@auth.example.org",
    emailVerified: true,
    isEmployee: false,
    isGlobalAdmin: false,
  });
  const claims = verifyAppSession(token);
  const url = new URL(await getLogoutUrl(claims?.loginName));

  expect(url.searchParams.get("logout_hint")).toBe("user@auth.example.org");
  expect(url.searchParams.get("post_logout_redirect_uri")).toBe(
    "https://app.example.org"
  );
  expect(new URL(await getLogoutUrl()).searchParams.has("logout_hint")).toBe(
    false
  );
});

test("preserves the NEI member grant in the signed app session", () => {
  const token = signAppSession({
    sub: "member",
    email: "member@example.org",
    emailVerified: true,
    isEmployee: false,
    isGlobalAdmin: false,
    isNeiMember: true,
  });
  expect(verifyAppSession(token)?.neiMember).toBe(true);
});

test.each([
  [
    { employee: { employee: {}, "nei-member": {}, admin: {} } },
    { isEmployee: true, isGlobalAdmin: false, isNeiMember: false },
  ],
  [
    { global: { "nei-member": {} } },
    { isEmployee: false, isGlobalAdmin: false, isNeiMember: true },
  ],
  [
    { global: ["admin", "nei-member"] },
    { isEmployee: false, isGlobalAdmin: true, isNeiMember: true },
  ],
  [
    { global: "nei-member" },
    { isEmployee: false, isGlobalAdmin: false, isNeiMember: true },
  ],
  [
    { other: { "nei-member": {} } },
    { isEmployee: false, isGlobalAdmin: false, isNeiMember: false },
  ],
])("maps only the configured global member claim: %j", (claims, expected) => {
  expect(mapIdentityRoles(claims, "employee", "global")).toEqual(expected);
});

test("expires NEI member sessions after five minutes", () => {
  vi.useFakeTimers();
  const token = signAppSession({
    sub: "member",
    email: "m@example.org",
    emailVerified: true,
    isEmployee: false,
    isGlobalAdmin: false,
    isNeiMember: true,
  });
  vi.advanceTimersByTime(299000);
  expect(verifyAppSession(token)?.neiMember).toBe(true);
  vi.advanceTimersByTime(1000);
  expect(verifyAppSession(token)).toBeNull();
});

test("rejects legacy member cookies older than five minutes", () => {
  const token = jwt.sign(
    {
      sub: "member",
      email: "m@example.org",
      neiMember: true,
      iat: Math.floor(Date.now() / 1000) - 300,
    },
    "a-secret-long-enough-to-sign-test-sessions",
    {
      algorithm: "HS256",
      issuer: "fallstack",
      audience: "fallstack-web",
      expiresIn: 28800,
    }
  );
  expect(verifyAppSession(token)).toBeNull();
});
