import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import InputSelect from ".";

describe("ui/InputSelect", () => {
  test("renders accessible label associated with select", () => {
    render(
      <InputSelect
        name="Ano"
        id="ano-select"
        options={[
          { value: "1", label: "1º Ano - Licenciatura" },
          { value: "2", label: "2º Ano - Licenciatura" },
        ]}
      />
    );

    const select = screen.getByLabelText("Ano");
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute("id", "ano-select");
    expect(screen.getByText("1º Ano - Licenciatura")).toBeInTheDocument();
  });

  test("renders disabled state with AA contrast", () => {
    render(
      <InputSelect
        name="Ano Bloqueado"
        id="ano-locked"
        disabled
        options={["1º Ano", "2º Ano"]}
      />
    );

    const select = screen.getByLabelText("Ano Bloqueado");
    expect(select).toBeDisabled();
    expect(select.className).toContain("disabled:text-gray-400");
    expect(select.className).toContain("rounded-full");
  });
});
