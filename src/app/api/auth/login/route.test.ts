// @vitest-environment node
import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

import { saveOidcRestart } from "@/application/repositories/oidcRestartRepository";

import { GET } from "./route";

const auth = vi.hoisted(() => ({
  state: "a".repeat(43),
  next: "/event?filter=" + "x".repeat(1800),
}));
vi.mock("@/application/repositories/oidcRestartRepository", () => ({
  saveOidcRestart: vi.fn(),
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
  const marker = response.cookies.get(`restart-${auth.state}`)?.value;
  expect(marker).toMatch(/^stored:[A-Za-z0-9_-]{43}$/u);
  expect(saveOidcRestart).toHaveBeenCalledWith(marker!.slice(7), auth.next);
});

test("stores oversized destinations without putting them in cookies", async () => {
  const previous = auth.next;
  auth.next = "/event?filter=" + "x".repeat(5000);
  try {
    const response = await GET(
      new NextRequest("https://fallstack.example.test/api/auth/login")
    );
    const marker = response.cookies.get(`restart-${auth.state}`)?.value;
    expect(marker).toMatch(/^stored:[A-Za-z0-9_-]{43}$/u);
    expect(saveOidcRestart).toHaveBeenCalledWith(marker!.slice(7), auth.next);
    expect(response.cookies.get("next")?.value).toBe("/");
  } finally {
    auth.next = previous;
  }
});
