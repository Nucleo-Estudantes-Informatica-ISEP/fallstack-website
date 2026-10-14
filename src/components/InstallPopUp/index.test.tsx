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
      value={{ isInstallable: true, handleConfirm: vi.fn() }}
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
