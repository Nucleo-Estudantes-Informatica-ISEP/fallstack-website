import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { StudentDto } from "@/application/dto/studentDto";

import CompanyViewProfileSectionContainer from ".";

const { getMock, patchMock, toastError } = vi.hoisted(() => ({
  getMock: vi.fn(),
  patchMock: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { get: getMock, patch: patchMock },
}));
vi.mock("react-toastify", () => ({ toast: { error: toastError } }));

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

function renderView(student = STUDENT) {
  return render(
    <CompanyViewProfileSectionContainer student={student} interests={[]} />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("uses the same dark layout as the preview, with no white card", () => {
  const { container } = renderView();

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

// The page only shows this view for a student the company already saved.
test("a saved student shows no save form and sends no save request", () => {
  renderView();

  expect(screen.queryByLabelText("Comentário (opcional)")).toBeNull();
  expect(screen.queryByRole("button", { name: /Salvar perfil/ })).toBeNull();
  expect(patchMock).not.toHaveBeenCalled();
});

test("a CV that cannot be opened shows a message", async () => {
  getMock.mockRejectedValue(new Error("CV not found"));
  renderView();

  fireEvent.click(screen.getByRole("button", { name: /Abrir o CV/ }));

  await waitFor(() =>
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível abrir o CV. Tenta novamente.",
      expect.anything()
    )
  );
});

test("only the links the student added are shown", () => {
  renderView();

  expect(
    screen.getByRole("link", { name: /GitHub de Beatriz/ })
  ).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.queryByRole("link", { name: /LinkedIn/ })).toBeNull();
});
