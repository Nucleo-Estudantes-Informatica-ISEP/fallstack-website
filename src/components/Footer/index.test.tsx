import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import NeiLogo from "~/public/assets/images/logo-white.png";
import { expect, test, vi } from "vitest";

import InstallableContext from "@/contexts/InstallableContext";
import CountdownLanding from "@/components/CountdownLanding";
import Footer from "@/components/Footer";
import { Language } from "@/domain/i18n/translations";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/hooks/useIsMobile", () => ({ default: () => false }));

function renderFooter(props: ComponentProps<typeof Footer>) {
  const handleConfirm = vi.fn();
  render(
    <InstallableContext.Provider
      value={{ isInstallable: true, installInstructions: null, handleConfirm }}
    >
      <Footer {...props} />
    </InstallableContext.Provider>
  );
  return handleConfirm;
}

test("landing footer retains social links without application controls", () => {
  renderFooter({ neiLogoSrc: NeiLogo, landing: true });
  expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
    "href",
    "https://www.instagram.com/nei_isep"
  );
  expect(
    screen.queryByRole("link", { name: "Política de Privacidade" })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Instalar aplicação" })
  ).not.toBeInTheDocument();
});

test("profile footer keeps the existing application controls", () => {
  renderFooter({ neiLogoSrc: NeiLogo });
  expect(
    screen.getByRole("link", { name: "Política de Privacidade" })
  ).toHaveAttribute("href", "/privacy-policy");
  expect(
    screen.getByRole("button", { name: "Instalar aplicação" })
  ).toBeInTheDocument();
});

test.each([
  [Language.PT, "Instalar aplicação"],
  [Language.EN, "Install app"],
])("%s footer passes its language to the install button", (language, label) => {
  const handleConfirm = renderFooter({ neiLogoSrc: NeiLogo, language });
  const button = screen.getByRole("button", { name: label });
  fireEvent.click(button);
  expect(handleConfirm).toHaveBeenCalledOnce();
});

test.each([
  [Language.PT, "Linktree do NEI"],
  [Language.EN, "NEI Linktree"],
])("%s footer translates the Linktree accessible name", (language, label) => {
  renderFooter({ neiLogoSrc: NeiLogo, language });
  const link = screen.getByRole("link", { name: label });
  expect(link).toHaveAttribute("title", label);
  expect(link).toHaveAttribute("href", "https://linktr.ee/nei_isep");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noreferrer");
});

test.each([
  [Language.PT, "Linktree do NEI"],
  [Language.EN, "NEI Linktree"],
])(
  "%s countdown homepage forwards its language to the real footer",
  (language, label) => {
    render(<CountdownLanding language={language} />);
    expect(screen.getByRole("link", { name: label })).toHaveAttribute(
      "href",
      "https://linktr.ee/nei_isep"
    );
  }
);
