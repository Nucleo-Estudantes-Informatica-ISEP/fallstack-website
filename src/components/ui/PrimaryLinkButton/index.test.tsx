import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import PrimaryLinkButton from "@/components/ui/PrimaryLinkButton";

test("renders a link with the correct destination", () => {
  render(
    <PrimaryLinkButton href="/signup">Quero registar-me</PrimaryLinkButton>
  );

  const link = screen.getByRole("link", {
    name: "Quero registar-me",
  });

  expect(link).toHaveAttribute("href", "/signup");
  expect(link).toHaveClass("ui-action");
});

test("does not nest a button inside the link", () => {
  const { container } = render(
    <PrimaryLinkButton href="/signup">Registar</PrimaryLinkButton>
  );

  expect(container.querySelector("a button")).toBeNull();
});

test("supports opening a PDF in a new tab", () => {
  render(
    <PrimaryLinkButton
      href="/assets/images/fallstack-map.pdf"
      target="_blank"
      rel="noopener noreferrer"
    >
      Como chegar?
    </PrimaryLinkButton>
  );

  const link = screen.getByRole("link", { name: "Como chegar?" });

  expect(link).toHaveAttribute("href", "/assets/images/fallstack-map.pdf");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("removes navigation when disabled", () => {
  const handleClick = vi.fn();

  render(
    <PrimaryLinkButton href="/signup" disabled onClick={handleClick}>
      Registar
    </PrimaryLinkButton>
  );

  const link = screen.getByText("Registar");

  expect(link).not.toHaveAttribute("href");
  expect(link).toHaveAttribute("aria-disabled", "true");
  expect(link).toHaveAttribute("tabindex", "-1");

  fireEvent.click(link);

  expect(handleClick).not.toHaveBeenCalled();
});

test("removes navigation and indicates loading", () => {
  render(
    <PrimaryLinkButton href="/signup" loading>
      Registar
    </PrimaryLinkButton>
  );

  const link = screen.getByText("A carregar…").closest("a");

  expect(link).not.toHaveAttribute("href");
  expect(link).toHaveAttribute("aria-busy", "true");
  expect(link).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("status")).toBeInTheDocument();
});
