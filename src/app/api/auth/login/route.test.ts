// @vitest-environment node
import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

import { GET } from "./route";

const auth = vi.hoisted(() => ({
  state: "a".repeat(43),
  next: "/event?filter=" + "x".repeat(1800),
}));
vi.mock("@/config/env.server", () => ({ serverEnv: { NODE_ENV: "test" } }));
vi.mock("@/application/services/zitadelAuthService", () => ({
  createAuthorizationRequest: async () => ({
    ...auth,
    url: "https://auth.example.test/authorize",
    nonce: "nonce",
    verifier: "verifier",
    maxAge: 600,
  }),
  oidcCookieNames: {
    state: "state",
    nonce: "nonce",
    verifier: "verifier",
    next: "next",
  },
  oidcRestartCookiePrefix: "restart-",
  oidcRestartCookieName: (state: string) => `restart-${state}`,
  verifyEmailCookieName: "verify-email",
}));

test("retains a long destination for an interrupted authorization", async () => {
  const response = await GET(
    new NextRequest("https://fallstack.example.test/api/auth/login")
  );
  expect(response.cookies.get(`restart-${auth.state}`)?.value).toBe(auth.next);
});
