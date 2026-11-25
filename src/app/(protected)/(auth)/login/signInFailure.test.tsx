import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import LoginPage from "./page";

vi.mock("@/config/env.server", () => ({
  serverEnv: {
    EVENT_MODE: "active",
    AUTH_REDIRECT_URI: "https://fallstack.example.test/api/auth/callback/zitadel",
    AUTH_ISSUER_URL: "https://auth.example.test",
  },
}));
vi.mock("@/application/services/sessionService", () => ({
  default: async () => null,
  isCurrentAccountInactive: async () => false,
}));
vi.mock("@/components/LoginCard", () => ({
  default: ({
    signInFailure,
    verifyEmailUrl,
  }: {
    signInFailure?: string;
    verifyEmailUrl?: string;
  }) => <a href={verifyEmailUrl}>{signInFailure}</a>,
}));

test("passes the email verification failure and action to the login card", async () => {
  render(
    await LoginPage({
      searchParams: Promise.resolve({
        error: "auth-verification-required",
        next: "/signup",
      }),
    })
  );

  expect(
    screen.getByRole("link", { name: "auth-verification-required" })
  ).toHaveAttribute("href", "/api/auth/login?verifyEmail=1&next=%2Fsignup");
});

test("passes a neutral failure to the login card for unknown errors", async () => {
  render(
    await LoginPage({ searchParams: Promise.resolve({ error: "toString" }) })
  );

  expect(
    screen.getByRole("link", { name: "auth-code-error" })
  ).toBeInTheDocument();
});
