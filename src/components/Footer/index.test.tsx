import { render, screen } from "@testing-library/react";
import NeiLogo from "~/public/assets/images/logo-white.png";
import { expect, test, vi } from "vitest";

import Footer from "@/components/Footer";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/InstallButton", () => ({
  default: () => <button>Install</button>,
}));

test("landing footer retains social links without application controls", () => {
  render(<Footer neiLogoSrc={NeiLogo} landing />);
  expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
    "href",
    "https://www.instagram.com/nei_isep"
  );
  expect(
    screen.queryByRole("link", { name: "Política de Privacidade" })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Install" })
  ).not.toBeInTheDocument();
});

test("profile footer keeps the existing application controls", () => {
  render(<Footer neiLogoSrc={NeiLogo} />);
  expect(
    screen.getByRole("link", { name: "Política de Privacidade" })
  ).toHaveAttribute("href", "/privacy-policy");
  expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
});
