import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import Input from ".";

describe("ui/Input", () => {
  test("renders accessible label associated with input", () => {
    render(<Input name="Email" id="user-email" placeholder="email@test.com" />);

    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "user-email");
    expect(input).toHaveAttribute("placeholder", "email@test.com");
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

  test("keeps contrast of at least 4.5:1 on disabled state and visible keyboard focus", () => {
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
    // disabled:text-gray-400 (>6:1 contrast against #141414) and disabled:opacity-100 to prevent browser dimming
    expect(input.className).toContain("disabled:text-gray-400");
    expect(input.className).toContain("disabled:opacity-100");
    expect(input.className).toContain("disabled:cursor-not-allowed");
    // Visible keyboard focus state
    expect(input.className).toContain("focus-visible:outline-2");
    expect(input.className).toContain("focus-visible:outline-primary");
  });

  test("renders short hint explaining why a field cannot be edited and connects aria-describedby", () => {
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

    const hint = screen.getByText(
      "Definido pela tua conta institucional e não pode ser alterado."
    );
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveAttribute("id", "locked-field-hint");
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
    expect(input.className).toContain("rounded-full");
    expect(input.className).toContain("pl-11");
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });
});
