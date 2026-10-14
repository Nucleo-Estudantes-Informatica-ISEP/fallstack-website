import { usePathname } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import TopBar from "@/components/TopBar";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/hooks/useSession", () => ({ default: () => ({ user: null }) }));
vi.mock("@/components/LogoutButton", () => ({ default: () => null }));
vi.mock("@/components/Profile/UserButton", () => ({ default: () => null }));

test("keeps account navigation off the temporary landing", () => {
  vi.mocked(usePathname).mockReturnValue("/");
  render(<TopBar />);
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

test("keeps account navigation available on other pages", () => {
  vi.mocked(usePathname).mockReturnValue("/privacy-policy");
  render(<TopBar />);
  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Iniciar sessão" })).toHaveAttribute(
    "href",
    "/login"
  );
});
