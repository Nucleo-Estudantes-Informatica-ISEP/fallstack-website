import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { StudentDto } from "@/application/dto/studentDto";

import CompanyViewProfileSectionContainer from ".";

const { getMock, patchMock, toastError, toastSuccess, toastWarning } =
  vi.hoisted(() => ({
    getMock: vi.fn(),
    patchMock: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
    toastWarning: vi.fn(),
  }));

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { get: getMock, patch: patchMock },
  HttpClientError: class HttpClientError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message);
    }
  },
}));
vi.mock("react-toastify", () => ({
  toast: { error: toastError, success: toastSuccess, warning: toastWarning },
}));

const STUDENT: StudentDto = {
  id: "s1",
  code: "Z101",
  name: "Beatriz Sintética",
  bio: "Gosto de bases de dados.",
  year: "3º Ano Licenciatura",
  course: null,
  cv: "cv-id",
  cvPurgedAt: null,
  linkedin: null,
  github: "https://github.com/beatriz",
  avatar: null,
  user: { email: "beatriz@example.com" },
};

function renderView(isSavedStudent: boolean, student = STUDENT) {
  return render(
    <CompanyViewProfileSectionContainer
      student={student}
      interests={[]}
      token="Z101"
      isSavedStudent={isSavedStudent}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("uses the same dark layout as the preview, with no white card", () => {
  const { container } = renderView(true);

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Beatriz Sintética"
  );
  for (const title of ["Informações pessoais", "Interesses", "Sobre"])
    expect(
      screen.getByRole("heading", { level: 2, name: title })
    ).toBeInTheDocument();
  expect(container.innerHTML).not.toMatch(/bg-white|text-black|bg-company/);
  expect(
    screen.getByText("Este estudante ainda não indicou interesses.")
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Voltar ao painel" })
  ).toHaveAttribute("href", "/dashboard");
});

test("a saved student shows no save form", () => {
  renderView(true);

  expect(screen.queryByLabelText("Comentário (opcional)")).toBeNull();
  expect(screen.queryByRole("button", { name: /Salvar perfil/ })).toBeNull();
});

test("an unsaved student can be saved with a labelled, bounded comment", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  patchMock.mockResolvedValue({});
  renderView(false);

  const field = screen.getByLabelText("Comentário (opcional)");
  expect(field).toHaveAttribute("maxLength", "1000");
  fireEvent.change(field, { target: { value: "Boa conversa" } });
  fireEvent.click(screen.getByRole("button", { name: "+ Salvar perfil" }));

  await waitFor(() =>
    expect(toastSuccess).toHaveBeenCalledWith("Perfil salvo com sucesso!")
  );
  expect(patchMock).toHaveBeenCalledWith("/saved", {
    token: "Z101",
    comment: "Boa conversa",
  });
  vi.useRealTimers();
});

test("a failed save shows a Portuguese message", async () => {
  patchMock.mockRejectedValue(new Error("Request failed"));
  renderView(false);

  fireEvent.click(screen.getByRole("button", { name: "+ Salvar perfil" }));

  await waitFor(() =>
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível guardar o perfil. Tenta novamente.",
      expect.anything()
    )
  );
});

test("a CV that cannot be opened shows a message", async () => {
  getMock.mockRejectedValue(new Error("CV not found"));
  renderView(true);

  fireEvent.click(screen.getByRole("button", { name: /Abrir o CV/ }));

  await waitFor(() =>
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível abrir o CV. Tenta novamente.",
      expect.anything()
    )
  );
});

test("only the links the student added are shown", () => {
  renderView(true);

  expect(
    screen.getByRole("link", { name: /GitHub de Beatriz/ })
  ).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.queryByRole("link", { name: /LinkedIn/ })).toBeNull();
});
