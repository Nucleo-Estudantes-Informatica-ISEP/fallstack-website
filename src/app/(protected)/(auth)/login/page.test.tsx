import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import LoginPage from "./page";

vi.mock("@/config/env.server", () => ({
  serverEnv: {
    AUTH_ISSUER_URL: "https://auth.nei-isep.org",
    AUTH_REDIRECT_URI: "https://fallstack.nei-isep.org/api/auth/callback/zitadel",
    AUTH_POST_LOGOUT_REDIRECT_URI: "https://logout.example.test/signed-out",
    EVENT_MODE: "active",
  },
}));
vi.mock("@/application/services/sessionService", () => ({
  default: async () => null,
  isCurrentAccountInactive: async () => false,
}));
vi.mock("@/components/LoginCard", () => ({
  default: ({ authHelpUrl }: { authHelpUrl: string }) => <a href={authHelpUrl}>Help</a>,
}));

test("passes a trusted app return to the shared help page", async () => {
  render(await LoginPage({ searchParams: Promise.resolve({ modal: "employee" }) }));
  const url = new URL(screen.getByRole("link", { name: "Help" }).getAttribute("href")!);
  expect(url.origin + url.pathname).toBe("https://auth.nei-isep.org/ui/v2/login/help");
  expect(url.searchParams.get("returnTo")).toBe("https://fallstack.nei-isep.org/login?modal=employee");
});
