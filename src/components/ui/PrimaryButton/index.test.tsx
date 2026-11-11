import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import PrimaryButton from "@/components/ui/PrimaryButton";

test("renders an accessible button", () => {
  render(<PrimaryButton>Guardar</PrimaryButton>);

  const button = screen.getByRole("button", { name: "Guardar" });

  expect(button).toBeEnabled();
  expect(button).toHaveAttribute("type", "button");
  expect(button).toHaveClass("ui-action");
});

test("calls onClick when clicked", () => {
  const handleClick = vi.fn();

  render(<PrimaryButton onClick={handleClick}>Guardar</PrimaryButton>);

  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  expect(handleClick).toHaveBeenCalledOnce();
});

test("supports explicit submit buttons", () => {
  render(<PrimaryButton type="submit">Registar</PrimaryButton>);

  expect(screen.getByRole("button", { name: "Registar" })).toHaveAttribute(
    "type",
    "submit"
  );
});

test("prevents clicks when disabled", () => {
  const handleClick = vi.fn();

  render(
    <PrimaryButton disabled onClick={handleClick}>
      Guardar
    </PrimaryButton>
  );

  const button = screen.getByRole("button", { name: "Guardar" });

  expect(button).toBeDisabled();

  fireEvent.click(button);

  expect(handleClick).not.toHaveBeenCalled();
});

test("disables the button and indicates loading", () => {
  const handleClick = vi.fn();

  render(
    <PrimaryButton loading onClick={handleClick}>
      Guardar
    </PrimaryButton>
  );

  const button = screen.getByRole("button");

  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("status")).toBeInTheDocument();

  fireEvent.click(button);

  expect(handleClick).not.toHaveBeenCalled();
});
