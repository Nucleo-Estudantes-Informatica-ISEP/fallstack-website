
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import InputSelect from "@/components/ui/InputSelect";

const options = ["1.º ano", "2.º ano", "3.º ano"];

describe("ui/InputSelect", () => {
  test("renders an accessible select", () => {
    render(
      <InputSelect
        name="Ano"
        options={options}
        placeholder="Seleciona o ano"
      />
    );

    expect(
      screen.getByRole("combobox", { name: "Ano" })
    ).toBeInTheDocument();
  });

  test("preserves an explicit id and option labels", () => {
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

    expect(screen.getByLabelText("Ano")).toHaveAttribute("id", "ano-select");
    expect(
      screen.getByRole("option", { name: "1º Ano - Licenciatura" })
    ).toBeInTheDocument();
  });

  test("shows a disabled placeholder initially", () => {
    render(
      <InputSelect
        name="Ano"
        options={options}
        placeholder="Seleciona o ano"
      />
    );

    expect(screen.getByRole("combobox", { name: "Ano" })).toHaveValue("");

    expect(
      screen.getByRole("option", { name: "Seleciona o ano" })
    ).toBeDisabled();
  });

  test("preserves an explicit default value", () => {
    render(
      <InputSelect
        name="Ano"
        options={options}
        placeholder="Seleciona o ano"
        defaultValue="2.º ano"
      />
    );

    expect(screen.getByRole("combobox", { name: "Ano" })).toHaveValue(
      "2.º ano"
    );
  });

  test("restores a saved selection with object options", () => {
    render(
      <InputSelect
        name="Ano"
        placeholder="Insere o ano"
        options={[{ value: "1", label: "Primeiro ano" }]}
        defaultValue="1"
      />
    );

    expect(screen.getByRole("combobox", { name: "Ano" })).toHaveValue("1");
  });

  test("supports disabled fields with accessible styles", () => {
    render(
      <InputSelect
        name="Ano Bloqueado"
        id="ano-locked"
        disabled
        options={options}
      />
    );

    const select = screen.getByLabelText("Ano Bloqueado");

    expect(select).toBeDisabled();
    expect(select).toHaveClass("disabled:text-gray-400", "rounded-full");
  });
});
