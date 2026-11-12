import { usePathname } from "next/navigation";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import InstallableContext from "@/contexts/InstallableContext";
import InstallPopUp from "@/components/InstallPopUp";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/hooks/useIsMobile", () => ({ default: () => false }));

const store = new Map<string, string>();
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

beforeEach(() => {
  store.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
});
afterEach(() => vi.restoreAllMocks());

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

test("shows the prompt when reading its storage preference fails", async () => {
  vi.spyOn(localStorageMock, "getItem").mockImplementation(() => {
    throw new DOMException("Storage is blocked", "SecurityError");
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});

  renderPrompt("/dashboard");

  expect(await screen.findByText(/Adiciona o Fallstack/)).toBeInTheDocument();
  expect(console.warn).toHaveBeenCalledWith(
    "Could not read the install prompt preference.",
    expect.any(DOMException)
  );
});

test("hides the prompt for the session when saving its preference fails", async () => {
  vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
    throw new DOMException("Storage is blocked", "SecurityError");
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});

  renderPrompt("/dashboard");
  fireEvent.click(await screen.findByText("Não mostrar mais"));

  await waitFor(() => {
    expect(screen.queryByText(/Adiciona o Fallstack/)).not.toBeInTheDocument();
  });
  expect(console.warn).toHaveBeenCalledWith(
    "Could not save the install prompt preference.",
    expect.any(DOMException)
  );
});
