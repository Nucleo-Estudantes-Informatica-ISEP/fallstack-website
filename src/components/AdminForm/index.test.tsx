import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import AdminForm from "@/components/AdminForm";
import { uploadAdminVideo } from "@/client/api/adminVideoUpload";

vi.mock("@/client/api/adminVideoUpload", () => ({ uploadAdminVideo: vi.fn() }));
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

test("submits a textarea field's value like a regular text field", () => {
  const onSubmit = vi.fn();
  render(
    <AdminForm
      sections={[
        {
          kind: "fields",
          title: "Detalhes",
          fields: [{ name: "answer", label: "Resposta", kind: "textarea" }],
        },
      ]}
      defaultValues={{ answer: "Existing answer" }}
      onSubmit={onSubmit}
    />
  );

  expect(screen.getByLabelText("Resposta")).toHaveValue("Existing answer");

  fireEvent.change(screen.getByLabelText("Resposta"), {
    target: { value: "Multi-line\nanswer" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Criar" }));

  expect(onSubmit).toHaveBeenCalledWith({ answer: "Multi-line\nanswer" });
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

test("uploads selected MP4 before saving and associates the returned URL", async () => {
  vi.mocked(uploadAdminVideo).mockResolvedValue({
    url: "/api/media/video/uploaded",
  });
  const onSubmit = vi.fn();
  render(
    <AdminForm
      sections={[
        {
          kind: "fields",
          title: "Profile",
          fields: [
            { kind: "textarea", name: "bodyText", label: "Profile body" },
            { kind: "video", name: "videoHref", label: "Video" },
          ],
        },
      ]}
      defaultValues={{ bodyText: "Profile" }}
      onSubmit={onSubmit}
    />
  );
  const file = new File(["mp4"], "company.mp4", { type: "video/mp4" });
  // JSDOM does not serialize FileList through FormData; supply the browser's form payload.
  const original = globalThis.FormData;
  vi.stubGlobal(
    "FormData",
    class extends original {
      constructor(form?: HTMLFormElement) {
        super(form);
        this.set("videoHrefFile", file);
      }
    }
  );
  try {
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        bodyText: "Profile",
        videoHref: "/api/media/video/uploaded",
      })
    );
    expect(uploadAdminVideo).toHaveBeenCalledWith(file);
  } finally {
    vi.stubGlobal("FormData", original);
  }
});
