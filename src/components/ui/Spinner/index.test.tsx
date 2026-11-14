import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Spinner from "@/components/ui/Spinner";

test("renders an accessible loading status", () => {
  render(<Spinner />);

  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.getByText("A carregar…")).toBeInTheDocument();
});

test("hides the loading text visually", () => {
  render(<Spinner />);

  expect(screen.getByText("A carregar…")).toHaveClass("sr-only");
});

test("marks the decorative icon as hidden from assistive technology", () => {
  render(<Spinner />);

  const status = screen.getByRole("status");
  const icon = status.querySelector("svg");

  expect(icon).toHaveAttribute("aria-hidden", "true");
});

test("supports custom styling", () => {
  render(<Spinner className="text-ui-highlight" />);

  const status = screen.getByRole("status");
  const icon = status.querySelector("svg");

  expect(icon).toHaveClass("text-ui-highlight");
  expect(icon).toHaveClass("animate-spin");
});
