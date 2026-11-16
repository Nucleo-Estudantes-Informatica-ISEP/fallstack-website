import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import AuthPageLayout from ".";

vi.mock("@/contexts/AuthContext", () => ({
  AuthContextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/components/TopBar", () => ({
  default: () => <nav>Top bar</nav>,
}));

test("splits the page into the event artwork and the form content", () => {
  render(
    <AuthPageLayout>
      <p>Form content</p>
    </AuthPageLayout>
  );

  const main = screen.getByRole("main");
  expect(main).toHaveAttribute("id", "main-content");
  expect(main).toContainElement(screen.getByText("Form content"));
  expect(screen.getAllByAltText("Fallstack 2026").length).toBeGreaterThan(0);
});

test("renders the split layout without the site top bar", () => {
  render(
    <AuthPageLayout>
      <p>Form content</p>
    </AuthPageLayout>
  );

  expect(screen.queryByText("Top bar")).not.toBeInTheDocument();
});

test("keeps a link back to the homepage beside the form", () => {
  render(
    <AuthPageLayout>
      <p>Form content</p>
    </AuthPageLayout>
  );

  const home = screen.getByRole("link", { name: "Página inicial" });
  expect(home).toHaveAttribute("href", "/");
  expect(screen.getByRole("main")).toContainElement(home);
});
