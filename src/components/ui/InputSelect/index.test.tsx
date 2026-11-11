import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import InputSelect from "@/components/ui/InputSelect";

const options = ["1.º ano", "2.º ano", "3.º ano"];

test("renders an accessible select", () => {
  render(
    <InputSelect name="Ano" options={options} placeholder="Seleciona o ano" />
  );

  expect(screen.getByRole("combobox", { name: "Ano" })).toBeInTheDocument();
});

test("shows a disabled placeholder initially", () => {
  render(
    <InputSelect name="Ano" options={options} placeholder="Seleciona o ano" />
  );

  const select = screen.getByRole("combobox", { name: "Ano" });

  expect(select).toHaveValue("");

  const placeholder = screen.getByRole("option", {
    name: "Seleciona o ano",
  });

  expect(placeholder).toBeDisabled();
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

  expect(screen.getByRole("combobox", { name: "Ano" })).toHaveValue("2.º ano");
});

test("supports disabled fields", () => {
  render(<InputSelect name="Ano" options={options} disabled />);

  expect(screen.getByRole("combobox", { name: "Ano" })).toBeDisabled();
});
