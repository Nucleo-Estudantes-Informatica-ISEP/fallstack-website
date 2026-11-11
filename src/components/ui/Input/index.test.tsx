import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Input from "@/components/ui/Input";

test("renders an input associated with its label", () => {
  render(<Input name="Nome" placeholder="Insere o teu nome" />);

  const input = screen.getByRole("textbox", { name: "Nome" });

  expect(input).toHaveAttribute("placeholder", "Insere o teu nome");
  expect(input).toHaveClass("ui-field");
});

test("preserves an explicit id", () => {
  render(<Input name="Email" id="employee-email" type="email" />);

  expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute(
    "id",
    "employee-email"
  );
});

test("supports disabled fields", () => {
  render(<Input name="Nome" disabled defaultValue="João" />);

  const input = screen.getByRole("textbox", { name: "Nome" });

  expect(input).toBeDisabled();
  expect(input).toHaveValue("João");
});

test("supports readonly fields", () => {
  render(<Input name="Nome" readOnly defaultValue="João" />);

  const input = screen.getByRole("textbox", { name: "Nome" });

  expect(input).toHaveAttribute("readonly");
  expect(input).toHaveValue("João");
});

test("preserves invalid state", () => {
  render(<Input name="Email" aria-invalid="true" />);

  expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute(
    "aria-invalid",
    "true"
  );
});

test("calls onChange when the value changes", () => {
  const handleChange = vi.fn();

  render(<Input name="Nome" onChange={handleChange} />);

  const input = screen.getByRole("textbox", { name: "Nome" });

  fireEvent.change(input, { target: { value: "Maria" } });

  expect(handleChange).toHaveBeenCalledOnce();
  expect(input).toHaveValue("Maria");
});

test("forwards the input ref", () => {
  const inputRef = vi.fn();

  render(<Input name="Nome" inputRef={inputRef} />);

  expect(inputRef).toHaveBeenCalledWith(
    screen.getByRole("textbox", { name: "Nome" })
  );
});
