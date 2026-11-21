// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import {
  createAuthorizationRequest,
  verifyEmailCookieName,
} from "@/application/services/zitadelAuthService";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/application/services/zitadelAuthService",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/application/services/zitadelAuthService")
    >()),
    createAuthorizationRequest: vi.fn(),
  })
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createAuthorizationRequest).mockResolvedValue({
    state: "fixture-state",
    nonce: "nonce",
    verifier: "verifier",
    next: "/",
    maxAge: 600,
    url: "https://auth.example.test/authorize",
  });
});

const valid = JSON.stringify({
  loginHint: "student@example.test",
  next: "/event?tab=profile",
});

test.each([
  [valid, "1", "/event?tab=profile", "student@example.test"],
  ["{", "1", "/signup", undefined],
  [JSON.stringify({ loginHint: "x".repeat(321) }), "1", "/signup", undefined],
  [valid, null, "/signup", undefined],
])(
  "uses only an opted-in, valid email recovery cookie",
  async (value, verifyEmail, next, hint) => {
    const url = new URL(
      "https://fallstack.example.test/api/auth/login?next=/signup"
    );
    if (verifyEmail) url.searchParams.set("verifyEmail", verifyEmail);
    const response = await GET(
      new NextRequest(url, {
        headers: {
          cookie: `${verifyEmailCookieName}=${encodeURIComponent(value)}`,
        },
      })
    );

    expect(createAuthorizationRequest).toHaveBeenCalledWith(next, hint);
    expect(response.cookies.get(verifyEmailCookieName)?.value).toBe("");
  }
);
