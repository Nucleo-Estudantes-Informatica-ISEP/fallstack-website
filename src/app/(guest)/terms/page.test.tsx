import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import TermsPage from "./page";

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
  }: {
    href: string;
    prefetch?: boolean;
    children: ReactNode;
  }) => (
    <a href={href} data-prefetch={prefetch}>
      {children}
    </a>
  ),
}));

test("does not prefetch the stateful signup redirect from the terms page", () => {
  render(<TermsPage />);
  const signup = screen.getByRole("link", { name: "Voltar ao registo" });
  expect(signup).toHaveAttribute("href", "/signup");
  expect(signup).toHaveAttribute("data-prefetch", "false");
});
