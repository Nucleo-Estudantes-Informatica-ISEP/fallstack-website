import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import AdminForm from "@/components/AdminForm";

test("renders the create label and submits typed field values when no id is given", async () => {
  const onSubmit = vi.fn();
  render(
    <AdminForm
      fields={[{ name: "name", label: "Nome", type: "text" }]}
      onSubmit={onSubmit}
    />
  );

  expect(screen.getByRole("button", { name: "Criar" })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "Fallstack" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Criar" }));

  expect(onSubmit).toHaveBeenCalledWith({ name: "Fallstack" });
});

test("renders the edit label and pre-fills default values when an id is given", () => {
  render(
    <AdminForm
      id="123"
      fields={[{ name: "name", label: "Nome", type: "text" }]}
      defaultValues={{ name: "Existing" }}
      onSubmit={vi.fn()}
    />
  );

  expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  expect(screen.getByLabelText("Nome")).toHaveValue("Existing");
});
