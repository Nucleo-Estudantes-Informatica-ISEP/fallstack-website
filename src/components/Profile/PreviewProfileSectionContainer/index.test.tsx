import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { StudentDto } from "@/application/dto/studentDto";

import PreviewProfileSectionContainer from ".";

const { getMock, patchMock, toastError, toastWarning, toastSuccess } =
  vi.hoisted(() => ({
    getMock: vi.fn(),
    patchMock: vi.fn(),
    toastError: vi.fn(),
    toastWarning: vi.fn(),
    toastSuccess: vi.fn(),
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
  toast: { error: toastError, warning: toastWarning, success: toastSuccess },
}));

const FULL: StudentDto = {
  id: "s1",
  code: "Z101",
  name: "Beatriz Sintética",
  bio: "Gosto de bases de dados.",
  year: "3º Ano Licenciatura",
  course: "Engenharia Informática",
  cv: "cv-id",
  cvPurgedAt: null,
  linkedin: "https://www.linkedin.com/in/beatriz",
  github: "https://github.com/beatriz",
  avatar: "/api/media/avatar/avatar-id",
  user: { email: "beatriz@example.com" },
};

const MINIMAL: StudentDto = {
  ...FULL,
  code: "Z102",
  name: "Rui Mínimo",
  bio: null,
  course: null,
  cv: null,
  linkedin: null,
  github: null,
  avatar: null,
  user: { email: "rui@example.com" },
};

function renderPreview(
  props: Partial<
    React.ComponentProps<typeof PreviewProfileSectionContainer>
  > = {}
) {
  return render(
    <PreviewProfileSectionContainer
      student={FULL}
      interests={["Frontend", "Backend"]}
      token="signed-token"
      isCompanyView
      isSavedStudent
      {...props}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("shows the student's details in dark panels, with no white cards", () => {
  const { container } = renderPreview();

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Beatriz Sintética"
  );
  expect(
    screen.getByText("3º Ano Licenciatura · Engenharia Informática")
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "beatriz@example.com" })
  ).toHaveAttribute("href", "mailto:beatriz@example.com");
  expect(screen.getByText("Gosto de bases de dados.")).toBeInTheDocument();
  for (const title of ["Informações pessoais", "Interesses", "Sobre"])
    expect(
      screen.getByRole("heading", { level: 2, name: title })
    ).toBeInTheDocument();
  expect(container.innerHTML).not.toMatch(/bg-white|text-black|bg-company/);
});

test("social links open in a new tab safely and name the student", () => {
  renderPreview();

  const github = screen.getByRole("link", {
    name: "GitHub de Beatriz Sintética (abre num novo separador)",
  });
  expect(github).toHaveAttribute("href", "https://github.com/beatriz");
  expect(github).toHaveAttribute("target", "_blank");
  expect(github).toHaveAttribute("rel", "noopener noreferrer");
  expect(
    screen.getByRole("link", { name: /LinkedIn de Beatriz Sintética/ })
  ).toBeInTheDocument();
});

test("interests are listed alphabetically", () => {
  renderPreview();

  expect(
    screen.getAllByRole("listitem").map((item) => item.textContent)
  ).toEqual(["Backend", "Frontend"]);
});

test("missing links, CV, bio and interests leave no empty controls", () => {
  renderPreview({ student: MINIMAL, interests: [] });

  expect(screen.queryByRole("link", { name: /GitHub|LinkedIn/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Abrir o CV/ })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Sobre" })).toBeNull();
  // Written for the company reading it, not for the student.
  expect(
    screen.getByText("Este estudante ainda não indicou interesses.")
  ).toBeInTheDocument();
  expect(screen.queryByText(/Ainda não definiste/)).toBeNull();
  expect(screen.getByText("3º Ano Licenciatura")).toBeInTheDocument();
});

test("a missing avatar falls back to the default image", () => {
  renderPreview({ student: MINIMAL });

  expect(screen.getByRole("img", { name: "profile image" })).toHaveAttribute(
    "src",
    expect.stringContaining("default_user")
  );
});

test("long names, emails and bios wrap", () => {
  const long = "x".repeat(200);
  renderPreview({
    student: {
      ...FULL,
      name: `Maria ${long}`,
      bio: long,
      user: { email: `${long}@example.com` },
    },
  });

  expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
    "wrap-break-word"
  );
  expect(screen.getByRole("link", { name: `${long}@example.com` })).toHaveClass(
    "wrap-anywhere"
  );
  expect(screen.getByText(long)).toHaveClass("wrap-break-word");
});

test("opening the CV uses the access-checked API", async () => {
  getMock.mockResolvedValue({ url: "/api/students/Z101/cv/file" });
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  renderPreview();

  fireEvent.click(
    screen.getByRole("button", { name: /Abrir o CV de Beatriz/ })
  );

  await waitFor(() =>
    expect(open).toHaveBeenCalledWith("/api/students/Z101/cv/file", "_blank")
  );
  expect(getMock).toHaveBeenCalledWith("/students/Z101/cv");
  open.mockRestore();
});

test("a CV that cannot be opened shows a message instead of failing silently", async () => {
  getMock.mockRejectedValue(new Error("CV not found"));
  renderPreview();

  fireEvent.click(screen.getByRole("button", { name: /Abrir o CV/ }));

  await waitFor(() =>
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível abrir o CV. Tenta novamente.",
      expect.anything()
    )
  );
});

test("the save action shows only to a company that has not saved the student", () => {
  const { unmount } = renderPreview({ isSavedStudent: true });
  expect(screen.queryByRole("button", { name: /Salvar perfil/ })).toBeNull();
  unmount();

  const other = renderPreview({ isCompanyView: false, isSavedStudent: false });
  expect(screen.queryByRole("button", { name: /Salvar perfil/ })).toBeNull();
  expect(screen.queryByRole("link", { name: "Voltar ao painel" })).toBeNull();
  other.unmount();

  renderPreview({ isSavedStudent: false });
  expect(
    screen.getByRole("button", { name: "+ Salvar perfil" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Voltar ao painel" })
  ).toHaveAttribute("href", "/dashboard");
});

test("saving sends the preview token and confirms", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  patchMock.mockResolvedValue({});
  renderPreview({ isSavedStudent: false });

  fireEvent.click(screen.getByRole("button", { name: "+ Salvar perfil" }));

  await waitFor(() =>
    expect(toastSuccess).toHaveBeenCalledWith("Perfil salvo com sucesso!")
  );
  expect(patchMock).toHaveBeenCalledWith("/saved", { token: "signed-token" });
  vi.useRealTimers();
});

// 409 comes from the duplicate check, 400 from a concurrent save's race.
test.each([409, 400])(
  "an already-saved student (%i) is a warning, not an error",
  async (status) => {
    const { HttpClientError } = await import("@/lib/http/client");
    const Err = HttpClientError as unknown as new (
      m: string,
      s: number
    ) => Error;

    patchMock.mockRejectedValueOnce(new Err("Student already saved", status));
    renderPreview({ isSavedStudent: false });
    fireEvent.click(screen.getByRole("button", { name: "+ Salvar perfil" }));
    await waitFor(() =>
      expect(toastWarning).toHaveBeenCalledWith(
        "Perfil já salvo!",
        expect.anything()
      )
    );
    expect(toastError).not.toHaveBeenCalled();
  }
);

test("other save failures show one Portuguese message", async () => {
  const { HttpClientError } = await import("@/lib/http/client");
  const Err = HttpClientError as unknown as new (m: string, s: number) => Error;

  patchMock.mockRejectedValueOnce(new Err("Internal Server Error", 500));
  renderPreview({ isSavedStudent: false });
  fireEvent.click(screen.getByRole("button", { name: "+ Salvar perfil" }));
  await waitFor(() =>
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível guardar o perfil. Tenta novamente.",
      expect.anything()
    )
  );
  expect(toastError).not.toHaveBeenCalledWith(
    "Internal Server Error",
    expect.anything()
  );
});
