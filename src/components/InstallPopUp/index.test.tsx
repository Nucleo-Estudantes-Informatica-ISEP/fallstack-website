import { usePathname } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import InstallableContext from "@/contexts/InstallableContext";
import InstallPopUp from "@/components/InstallPopUp";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/hooks/useIsMobile", () => ({ default: () => false }));

const localStorageMock: Storage = {
  get length() {
    return store.size;
  },
  clear: () => store.clear(),
  getItem: (key) => store.get(key) ?? null,
  key: (index) => [...store.keys()][index] ?? null,
  removeItem: (key) => store.delete(key),
  setItem: (key, value) => store.set(key, String(value)),
};
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
});

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
