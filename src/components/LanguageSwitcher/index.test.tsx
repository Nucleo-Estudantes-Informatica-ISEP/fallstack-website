import { usePathname } from "next/navigation";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LanguageSwitcher from "./index";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    document.cookie = "fallstack-language=; Path=/; Max-Age=0";
  });

  it("saves English and restores it after navigating away", () => {
    vi.mocked(usePathname).mockReturnValue("/event/pt");
    const { rerender } = render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /selecionar idioma/i }));
    const link = screen.getByRole("menuitem", { name: /english/i });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(document.cookie).toContain("fallstack-language=en");
    vi.mocked(usePathname).mockReturnValue("/login");
    rerender(<LanguageSwitcher />);
    expect(
      screen.getByRole("button", { name: /selecionar idioma/i })
    ).toHaveTextContent("EN");
  });

  it("renders trigger button with current language PT when on homepage or /event/pt", () => {
    vi.mocked(usePathname).mockReturnValue("/event/pt");
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button", {
      name: /selecionar idioma/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("PT");
  });

  it("renders trigger button with current language EN when on /event/en", () => {
    vi.mocked(usePathname).mockReturnValue("/event/en");
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button", {
      name: /selecionar idioma/i,
    });
    expect(button).toHaveTextContent("EN");
  });

  it("opens dropdown menu on button click and provides links to both languages", () => {
    vi.mocked(usePathname).mockReturnValue("/event/pt");
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button", {
      name: /selecionar idioma/i,
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    const ptLink = screen.getByRole("menuitem", { name: /português/i });
    const enLink = screen.getByRole("menuitem", { name: /english/i });

    expect(ptLink).toHaveAttribute("href", "/event/pt");
    expect(enLink).toHaveAttribute("href", "/event/en");
  });

  it("swaps language prefix when currently on /event/en", () => {
    vi.mocked(usePathname).mockReturnValue("/event/en");
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: /selecionar idioma/i }));

    const ptLink = screen.getByRole("menuitem", { name: /português/i });
    expect(ptLink).toHaveAttribute("href", "/event/pt");
  });

  it("closes dropdown on Escape key", () => {
    vi.mocked(usePathname).mockReturnValue("/event/pt");
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: /selecionar idioma/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
