// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { saveOidcRestart } from "@/application/repositories/oidcRestartRepository";
import { parseOidcRestartMarker } from "@/domain/auth/oidcRestartMarker";

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

beforeEach(() => vi.clearAllMocks());

test("retains a long destination for an interrupted authorization", async () => {
  const response = await GET(
    new NextRequest("https://fallstack.example.test/api/auth/login")
  );
  const cookie = response.cookies.get(`restart-${auth.state}`);
  expect(cookie).toMatchObject({
    path: "/api/auth",
    maxAge: 1800,
    httpOnly: true,
  });
  const marker = parseOidcRestartMarker(cookie?.value);
  expect(marker?.issuedAt).toBeGreaterThan(0);
  expect(saveOidcRestart).toHaveBeenCalledWith(marker?.token, auth.next);
});

test("stores oversized destinations without putting them in cookies", async () => {
  const previous = auth.next;
  auth.next = "/event?filter=" + "x".repeat(5000);
  try {
    const response = await GET(
      new NextRequest("https://fallstack.example.test/api/auth/login")
    );
    const marker = response.cookies.get(`restart-${auth.state}`)?.value;
    expect(saveOidcRestart).toHaveBeenCalledWith(
      parseOidcRestartMarker(marker)?.token,
      auth.next
    );
    expect(response.cookies.get("next")?.value).toBe("/");
  } finally {
    auth.next = previous;
  }
});

test("evicts an older restart marker even when request cookies arrive out of order", async () => {
  const base = Date.parse("2026-11-21T00:00:00Z");
  const cookies = [4, 1, 3, 2].map(
    (offset) =>
      `restart-state-${offset}=stored:${base + offset}:${"z".repeat(43)}`
  );
  const response = await GET(
    new NextRequest("https://fallstack.example.test/api/auth/login", {
      headers: { cookie: cookies.join("; ") },
    })
  );
  expect(response.cookies.get("restart-state-1")).toMatchObject({
    path: "/api/auth",
    maxAge: 0,
  });
  for (const offset of [2, 3, 4]) {
    expect(response.cookies.get(`restart-state-${offset}`)).toBeUndefined();
  }
});

test("does not store the default destination", async () => {
  const previous = auth.next;
  auth.next = "/";
  try {
    const response = await GET(
      new NextRequest("https://fallstack.example.test/api/auth/login")
    );
    expect(saveOidcRestart).not.toHaveBeenCalled();
    expect(response.cookies.get(`restart-${auth.state}`)).toBeUndefined();
  } finally {
    auth.next = previous;
  }
});

test("lets the user retry with their destination when the store is unavailable", async () => {
  vi.mocked(saveOidcRestart).mockRejectedValueOnce(
    new Error("store unavailable")
  );
  const response = await GET(
    new NextRequest("https://fallstack.example.test/api/auth/login")
  );
  const retry = new URL(response.headers.get("location")!);
  expect(retry.pathname).toBe("/login");
  expect(retry.searchParams.get("error")).toBe("auth-code-error");
  expect(retry.searchParams.get("next")).toBe(auth.next);
  expect(response.headers.get("set-cookie")).toBeNull();
});

test("does not persist a destination beyond the restart size bound", async () => {
  const previous = auth.next;
  auth.next = "/" + "x".repeat(8192);
  try {
    const response = await GET(
      new NextRequest("https://fallstack.example.test/api/auth/login")
    );
    expect(response.cookies.get("next")?.value).toBe("/");
    expect(saveOidcRestart).not.toHaveBeenCalled();
  } finally {
    auth.next = previous;
  }
});
