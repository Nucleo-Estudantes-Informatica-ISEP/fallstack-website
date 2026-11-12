import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import Input from "@/components/ui/Input";

describe("ui/Input", () => {
  test("renders an input associated with its label", () => {
    render(<Input name="Nome" placeholder="Insere o teu nome" />);

    const input = screen.getByRole("textbox", { name: "Nome" });

    expect(input).toHaveAttribute("placeholder", "Insere o teu nome");
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

  test("supports custom label prop separate from name", () => {
    render(
      <Input name="custom_field" id="custom-field" label="Custom Label" />
    );

    expect(screen.getByLabelText("Custom Label")).toHaveAttribute(
      "name",
      "custom_field"
    );
  });

  test("keeps accessible disabled and focus styles", () => {
    render(
      <Input
        name="Disabled field"
        id="disabled-field"
        disabled
        defaultValue="Locked value"
      />
    );

    const input = screen.getByLabelText("Disabled field");

    expect(input).toBeDisabled();
    expect(input).toHaveClass(
      "disabled:text-gray-400",
      "disabled:opacity-100",
      "disabled:cursor-not-allowed",
      "focus-visible:outline-2",
      "focus-visible:outline-primary"
    );
  });

  test("renders hint connected with aria-describedby", () => {
    render(
      <Input
        name="Locked field"
        id="locked-field"
        disabled
        hint="Definido pela tua conta institucional e não pode ser alterado."
      />
    );

    const input = screen.getByLabelText("Locked field");

    expect(input).toHaveAttribute("aria-describedby", "locked-field-hint");

    expect(
      screen.getByText(
        "Definido pela tua conta institucional e não pode ser alterado."
      )
    ).toHaveAttribute("id", "locked-field-hint");
  });

  test("renders with icon and pill shape", () => {
    render(
      <Input
        name="LinkedIn"
        id="linkedin-field"
        icon={<span data-testid="test-icon">🔗</span>}
      />
    );

    const input = screen.getByLabelText("LinkedIn");

    expect(input).toHaveClass("rounded-full");
    expect(screen.getByTestId("test-icon").parentElement).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });
});
