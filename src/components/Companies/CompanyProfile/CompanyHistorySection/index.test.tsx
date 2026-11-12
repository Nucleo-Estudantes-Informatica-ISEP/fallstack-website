import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { SavedStudentDto } from "@/application/dto/historyDto";

import CompanySavesSection from ".";

const { putMock, toastErrorMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", () => ({ httpClient: { put: putMock } }));
vi.mock("react-toastify", () => ({ toast: { error: toastErrorMock } }));

function saved(
  code: string,
  name: string,
  comment: string | null = null
): SavedStudentDto {
  return {
    studentId: `id-${code}`,
    createdAt: "2026-11-12T16:36:00.000Z",
    comment,
    student: { code, name },
  } as SavedStudentDto;
}

beforeEach(() => {
  vi.clearAllMocks();
  putMock.mockResolvedValue({});
});

test("an empty history explains where saved students will appear", () => {
  render(<CompanySavesSection historyData={[]} />);

  expect(screen.getByText(/Ainda não há perfis guardados/)).toBeInTheDocument();
  expect(screen.queryByRole("list")).toBeNull();
});

test("each entry links to the preview and has a machine-readable date", () => {
  render(
    <CompanySavesSection historyData={[saved("Z101", "Beatriz Sintética")]} />
  );

  expect(
    screen.getByRole("list", { name: "Histórico de scans" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Beatriz Sintética" })
  ).toHaveAttribute("href", "/student/Z101/preview");
  expect(screen.getByRole("listitem").querySelector("time")).toHaveAttribute(
    "datetime",
    "2026-11-12T16:36:00.000Z"
  );
});

test("long names and comments wrap instead of overflowing", () => {
  const long = "x".repeat(300);
  render(
    <CompanySavesSection historyData={[saved("Z103", `Maria ${long}`, long)]} />
  );

  expect(screen.getByRole("link")).toHaveClass(
    "line-clamp-2",
    "wrap-break-word"
  );
  expect(screen.getByRole("link")).toHaveAttribute("title", `Maria ${long}`);
  expect(screen.getByText(long)).toHaveClass(
    "wrap-anywhere",
    "whitespace-pre-wrap"
  );
});

test("the edit button names the student and says whether a comment exists", () => {
  render(
    <CompanySavesSection
      historyData={[
        saved("Z101", "Beatriz Sintética", "Boa conversa"),
        saved("Z102", "Rui Mínimo"),
      ]}
    />
  );

  expect(
    screen.getByRole("button", {
      name: "Editar comentário sobre Beatriz Sintética",
    })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", {
      name: "Adicionar comentário sobre Rui Mínimo",
    })
  ).toBeInTheDocument();
  expect(screen.getByText("Sem comentário")).toBeInTheDocument();
});

test("opening the editor focuses a labelled field with the current comment", async () => {
  render(
    <CompanySavesSection
      historyData={[saved("Z101", "Beatriz Sintética", "Boa conversa")]}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /Editar comentário/ }));

  const field = screen.getByLabelText("Comentário sobre Beatriz Sintética");
  await waitFor(() => expect(field).toHaveFocus());
  expect(field).toHaveValue("Boa conversa");
  expect(field).toHaveAttribute("maxLength", "1000");
  expect(field).toHaveAccessibleDescription("12/1000");
});

test("saving sends the comment, shows it and returns focus to the edit button", async () => {
  render(<CompanySavesSection historyData={[saved("Z102", "Rui Mínimo")]} />);

  fireEvent.click(screen.getByRole("button", { name: /Adicionar comentário/ }));
  fireEvent.change(screen.getByLabelText("Comentário sobre Rui Mínimo"), {
    target: { value: "Interessado em backend" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(screen.getByText("Interessado em backend")).toBeInTheDocument()
  );
  expect(putMock).toHaveBeenCalledWith("/saved", {
    studentId: "id-Z102",
    comment: "Interessado em backend",
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Editar comentário sobre Rui Mínimo" })
    ).toHaveFocus()
  );
});

test("a failed save keeps the editor open with the typed text", async () => {
  putMock.mockRejectedValue(new Error("Request failed"));
  render(<CompanySavesSection historyData={[saved("Z102", "Rui Mínimo")]} />);

  fireEvent.click(screen.getByRole("button", { name: /Adicionar comentário/ }));
  fireEvent.change(screen.getByLabelText("Comentário sobre Rui Mínimo"), {
    target: { value: "Texto por guardar" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Não foi possível atualizar o comentário.",
      expect.anything()
    )
  );
  expect(screen.getByLabelText("Comentário sobre Rui Mínimo")).toHaveValue(
    "Texto por guardar"
  );
});

test("removing sends null and is offered only when a comment exists", async () => {
  const { unmount } = render(
    <CompanySavesSection historyData={[saved("Z102", "Rui Mínimo")]} />
  );
  fireEvent.click(screen.getByRole("button", { name: /Adicionar comentário/ }));
  expect(screen.queryByRole("button", { name: "Remover" })).toBeNull();
  unmount();

  render(
    <CompanySavesSection
      historyData={[saved("Z101", "Beatriz Sintética", "Boa conversa")]}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: /Editar comentário/ }));
  fireEvent.click(screen.getByRole("button", { name: "Remover" }));

  await waitFor(() =>
    expect(screen.getByText("Sem comentário")).toBeInTheDocument()
  );
  expect(putMock).toHaveBeenCalledWith("/saved", {
    studentId: "id-Z101",
    comment: null,
  });
});

test("Cancelar and Escape discard the edit and return focus", async () => {
  render(
    <CompanySavesSection
      historyData={[saved("Z101", "Beatriz Sintética", "Boa conversa")]}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /Editar comentário/ }));
  fireEvent.change(screen.getByLabelText(/Comentário sobre/), {
    target: { value: "Rascunho" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

  expect(screen.getByText("Boa conversa")).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Editar comentário/ })
    ).toHaveFocus()
  );

  fireEvent.click(screen.getByRole("button", { name: /Editar comentário/ }));
  fireEvent.keyDown(screen.getByLabelText(/Comentário sobre/), {
    key: "Escape",
  });

  expect(screen.queryByLabelText(/Comentário sobre/)).toBeNull();
  expect(putMock).not.toHaveBeenCalled();
});
