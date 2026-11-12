import { usePathname } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import TopBar from "@/components/TopBar";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
const { session } = vi.hoisted(() => ({ session: { user: null as object | null } }));
vi.mock("@/hooks/useSession", () => ({ default: () => session }));
vi.mock("@/components/LogoutButton", () => ({ default: () => null }));
vi.mock("@/components/Profile/UserButton", () => ({
  default: () => <a href="/student/test">O meu perfil</a>,
}));

test("shows sign in on the homepage", () => {
  vi.mocked(usePathname).mockReturnValue("/");
  session.user = null;
  render(<TopBar />);
  expect(screen.getByRole("link", { name: "Iniciar sessão" })).toHaveAttribute(
    "href",
    "/login"
  );
});

test("shows profile navigation on the homepage when signed in", () => {
  vi.mocked(usePathname).mockReturnValue("/");
  session.user = {};
  render(<TopBar />);
  expect(screen.getByRole("link", { name: "O meu perfil" })).toBeInTheDocument();
});

test("keeps account navigation available on other pages", () => {
  vi.mocked(usePathname).mockReturnValue("/privacy-policy");
  session.user = null;
  render(<TopBar />);
  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Iniciar sessão" })).toHaveAttribute(
    "href",
    "/login"
  );
});
