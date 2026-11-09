import { usePathname } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import InstallableContext from "@/contexts/InstallableContext";
import InstallPopUp from "@/components/InstallPopUp";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/hooks/useIsMobile", () => ({ default: () => false }));

beforeEach(() => localStorage.clear());

function renderPrompt(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname);
  return render(
    <InstallableContext.Provider
      value={{
        isInstallable: true,
        installInstructions: null,
        handleConfirm: vi.fn(),
      }}
    >
      <InstallPopUp />
    </InstallableContext.Provider>
  );
}

test("does not cover the landing with an install prompt", () => {
  renderPrompt("/");
  expect(screen.queryByText(/Adiciona o Fallstack/)).not.toBeInTheDocument();
});

test("retains the install prompt on application pages", () => {
  renderPrompt("/dashboard");
  expect(screen.getByText(/Adiciona o Fallstack/)).toBeInTheDocument();
});

test("shows device-specific guidance when the native install prompt is unavailable", () => {
  vi.mocked(usePathname).mockReturnValue("/dashboard");
  render(
    <InstallableContext.Provider
      value={{
        isInstallable: false,
        installInstructions:
          "No iPhone ou iPad, toca em Partilhar e escolhe “Adicionar ao ecrã principal”.",
        handleConfirm: vi.fn(),
      }}
    >
      <InstallPopUp />
    </InstallableContext.Provider>
  );

  expect(screen.getByText(/No iPhone ou iPad/)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Adicionar" })
  ).not.toBeInTheDocument();
});
