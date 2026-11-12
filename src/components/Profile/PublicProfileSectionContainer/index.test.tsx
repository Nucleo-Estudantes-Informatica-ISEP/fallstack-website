import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { StudentDto } from "@/application/dto/studentDto";

import PublicProfileSectionContainer from ".";

const { getMock, toastError } = vi.hoisted(() => ({
  getMock: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("client-only", () => ({}));
vi.mock("@/lib/http/client", () => ({ httpClient: { get: getMock } }));
vi.mock("react-toastify", () => ({ toast: { error: toastError } }));

const STUDENT: StudentDto = {
  id: "s1",
  code: "Z105",
  name: "Ana Interesses",
  bio: null,
  year: "1º Ano Mestrado",
  course: "Engenharia Informática",
  cv: "cv-id",
  cvPurgedAt: null,
  linkedin: "https://www.linkedin.com/in/ana",
  github: null,
  avatar: null,
  user: { email: "ana@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("uses the same dark layout as the preview, with no white card", () => {
  const { container } = render(
    <PublicProfileSectionContainer
      student={STUDENT}
      interests={["Mobile", "AI"]}
    />
  );

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Ana Interesses"
  );
  expect(
    screen.getByText("1º Ano Mestrado · Engenharia Informática")
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole("listitem").map((item) => item.textContent)
  ).toEqual(["AI", "Mobile"]);
  expect(container.innerHTML).not.toMatch(/bg-white|text-black/);
});

test("a missing avatar shows the default image instead of an endless placeholder", () => {
  render(<PublicProfileSectionContainer student={STUDENT} interests={[]} />);

  expect(screen.getByRole("img", { name: "profile image" })).toHaveAttribute(
    "src",
    expect.stringContaining("default_user")
  );
});

test("offers no save action and no company dashboard link", () => {
  render(<PublicProfileSectionContainer student={STUDENT} interests={[]} />);

  expect(screen.queryByRole("button", { name: /Salvar/ })).toBeNull();
  expect(screen.queryByRole("link", { name: "Voltar ao painel" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Sobre" })).toBeNull();
});

test("a CV that cannot be opened shows a message", async () => {
  getMock.mockRejectedValue(new Error("CV not found"));
  render(<PublicProfileSectionContainer student={STUDENT} interests={[]} />);

  fireEvent.click(screen.getByRole("button", { name: /Abrir o CV de Ana/ }));

  await waitFor(() =>
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível abrir o CV. Tenta novamente.",
      expect.anything()
    )
  );
});
