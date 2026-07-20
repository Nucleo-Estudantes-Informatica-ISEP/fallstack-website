import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import AdminForm from "@/components/AdminForm";

vi.mock("@/client/api/adminUpload", () => ({ uploadAdminImage: vi.fn() }));

test("renders the create label and submits typed field values when no id is given", async () => {
  const onSubmit = vi.fn();
  render(
    <AdminForm
      sections={[
        {
          kind: "fields",
          title: "Detalhes",
          fields: [{ name: "name", label: "Nome", kind: "text" }],
        },
      ]}
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
      sections={[
        {
          kind: "fields",
          title: "Detalhes",
          fields: [{ name: "name", label: "Nome", kind: "text" }],
        },
      ]}
      defaultValues={{ name: "Existing" }}
      onSubmit={vi.fn()}
    />
  );

  expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  expect(screen.getByLabelText("Nome")).toHaveValue("Existing");
});

test("collects checked options from a multiSelect field as an array", () => {
  const onSubmit = vi.fn();
  render(
    <AdminForm
      sections={[
        {
          kind: "fields",
          title: "Interesses",
          fields: [
            {
              name: "interests",
              label: "Interesses",
              kind: "multiSelect",
              options: [
                { label: "AI", value: "ai" },
                { label: "Web", value: "web" },
              ],
            },
          ],
        },
      ]}
      onSubmit={onSubmit}
    />
  );

  fireEvent.click(screen.getByLabelText("AI"));
  fireEvent.click(screen.getByRole("button", { name: "Criar" }));

  expect(onSubmit).toHaveBeenCalledWith({ interests: ["ai"] });
});

test("only includes the password section's value when both fields are filled and matching", () => {
  const onSubmit = vi.fn();
  render(
    <AdminForm
      sections={[
        { kind: "password", title: "Palavra-passe", name: "password" },
      ]}
      onSubmit={onSubmit}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Criar" }));

  expect(onSubmit).toHaveBeenCalledWith({});
});

test("rejects submission when the password confirmation doesn't match", () => {
  const onSubmit = vi.fn();
  render(
    <AdminForm
      sections={[
        { kind: "password", title: "Palavra-passe", name: "password" },
      ]}
      onSubmit={onSubmit}
    />
  );

  fireEvent.change(screen.getByLabelText("Nova palavra-passe"), {
    target: { value: "secret123" },
  });
  fireEvent.change(screen.getByLabelText("Confirmar palavra-passe"), {
    target: { value: "different" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Criar" }));

  expect(onSubmit).not.toHaveBeenCalled();
});
