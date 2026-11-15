import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import useSession from "@/hooks/useSession";
import type { StudentDto } from "@/application/dto/studentDto";

import ProfileSectionContainer from ".";

// Frame-level behaviour of the student dashboard: menu, header, notice and
// Logout. Section contents are stubbed; each section has its own tests.
vi.mock("@/hooks/useSession", () => ({ default: vi.fn() }));
vi.mock("../StatsSection", () => ({
  default: ({ companiesLeft }: { companiesLeft: number }) => (
    <p>Summary content, {companiesLeft} companies left</p>
  ),
}));
vi.mock("../ActionsSection", () => ({
  default: ({ actions }: { actions: unknown[] }) => (
    <p>Challenges content, {actions.length} challenges</p>
  ),
}));
vi.mock("../ProfileSection", () => ({
  default: () => <p>Personal information content</p>,
}));
vi.mock("../UserImage", () => ({
  default: ({
    imageSrc,
    editable,
    onChange,
  }: {
    imageSrc: string | null;
    editable?: boolean;
    onChange?: (image: string) => void;
  }) => (
    <>
      <p>Avatar {imageSrc}</p>
      {editable && (
        <button type="button" onClick={() => onChange?.("data:image/png,x")}>
          Choose avatar
        </button>
      )}
    </>
  ),
}));
vi.mock("../AvatarCropper", () => ({ default: () => null }));
vi.mock("@/components/PassSection/PassMenuContent", () => ({
  default: ({ student }: { student: { code: string } }) => (
    <p>Pass content for {student.code}</p>
  ),
}));

const student: StudentDto = {
  id: "s1",
  code: "Z100",
  name: "Carolina Referência",
  bio: null,
  year: "2º Ano Licenciatura",
  course: "Engenharia Informática",
  cv: null,
  cvPurgedAt: null,
  linkedin: null,
  github: null,
  avatar: "/api/media/avatar/z100",
  user: { email: "carolina@example.com" },
};

const signedInAsStudent = () =>
  vi.mocked(useSession).mockReturnValue({
    user: { student: { code: "Z100" } },
    clear: vi.fn(),
  } as never);

const renderFrame = (overrides: Partial<StudentDto> = {}) =>
  render(
    <ProfileSectionContainer
      student={{ ...student, ...overrides }}
      interestIds={[]}
      globalStats={{ totalScans: 0, totalSaves: 0 }}
      todayStats={0}
      companiesLeft={12}
      historyData={[]}
      actions={[]}
      availableInterests={[]}
    />
  );

const menu = () => screen.getByRole("navigation", { name: "Perfil" });

beforeEach(() => {
  vi.clearAllMocks();
  signedInAsStudent();
});

test("the menu lists the four tabs and Logout, in order", () => {
  renderFrame();

  expect(
    within(menu())
      .getAllByRole("button")
      .map((button) => button.textContent)
  ).toEqual([
    "Sumário",
    "Passe do FallStack",
    "Desafios",
    "Informações pessoais",
    "Logout",
  ]);
});

test("the pass entry shows only for a student session", () => {
  vi.mocked(useSession).mockReturnValue({
    user: null,
    clear: vi.fn(),
  } as never);

  renderFrame();

  expect(
    within(menu()).queryByRole("button", { name: "Passe do FallStack" })
  ).toBeNull();
  expect(
    within(menu()).getByRole("button", { name: "Desafios" })
  ).toBeInTheDocument();
});

test("Sumário is open first and marked as the current entry", () => {
  renderFrame();

  expect(
    screen.getByText("Summary content, 12 companies left")
  ).toBeInTheDocument();
  expect(
    within(menu()).getByRole("button", { name: "Sumário" })
  ).toHaveAttribute("aria-current", "true");
});

test("each menu entry shows its own content", () => {
  renderFrame();

  fireEvent.click(
    within(menu()).getByRole("button", { name: "Passe do FallStack" })
  );
  expect(screen.getByText("Pass content for Z100")).toBeInTheDocument();

  fireEvent.click(within(menu()).getByRole("button", { name: "Desafios" }));
  expect(screen.getByRole("heading", { name: "Desafios" })).toBeInTheDocument();
  expect(
    screen.getByText("Challenges content, 0 challenges")
  ).toBeInTheDocument();

  fireEvent.click(
    within(menu()).getByRole("button", { name: "Informações pessoais" })
  );
  expect(screen.getByText("Personal information content")).toBeInTheDocument();
  expect(
    within(menu()).getByRole("button", { name: "Informações pessoais" })
  ).toHaveAttribute("aria-current", "true");

  fireEvent.click(within(menu()).getByRole("button", { name: "Sumário" }));
  expect(
    screen.getByText("Summary content, 12 companies left")
  ).toBeInTheDocument();
});

test("Logout asks for confirmation and Cancelar keeps the session", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  renderFrame();

  fireEvent.click(within(menu()).getByRole("button", { name: "Logout" }));

  const dialog = screen.getByRole("dialog", { name: "Terminar sessão" });
  expect(within(dialog).getByText("Queres mesmo sair?")).toBeInTheDocument();
  expect(
    within(dialog).getByRole("button", { name: "Sair" })
  ).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Terminar sessão" })).toBeNull()
  );
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

test("the header shows the student's name, email and avatar", () => {
  renderFrame();

  expect(
    screen.getByRole("heading", { level: 1, name: "Carolina Referência" })
  ).toBeInTheDocument();
  expect(screen.getByText("carolina@example.com")).toBeInTheDocument();
  expect(screen.getByText("Avatar /api/media/avatar/z100")).toBeInTheDocument();
});

test("name and email use the font tokens, not inline styles", () => {
  renderFrame();

  const name = screen.getByRole("heading", { level: 1 });
  const email = screen.getByText("carolina@example.com");
  expect(name).not.toHaveAttribute("style");
  expect(email).not.toHaveAttribute("style");
  expect(name).toHaveClass("font-title");
  expect(email).toHaveClass("font-sans");
  // The email may break only where it overflows, not anywhere.
  expect(email).not.toHaveClass("break-all");
});

test("the Desafios heading uses the shared section heading style", () => {
  renderFrame();

  fireEvent.click(within(menu()).getByRole("button", { name: "Desafios" }));

  const heading = screen.getByRole("heading", { name: "Desafios" });
  expect(heading.tagName).toBe("H2");
  expect(heading).not.toHaveAttribute("style");
  expect(heading).toHaveClass(
    "font-sans",
    "font-semibold",
    "text-2xl",
    "lg:text-[1.75rem]",
    "text-center",
    "lg:text-left"
  );
});

test("Logout sits a small gap below the other entries", () => {
  renderFrame();

  expect(within(menu()).getByRole("button", { name: "Logout" })).toHaveClass(
    "mt-1"
  );
  expect(
    within(menu()).getByRole("button", { name: "Informações pessoais" })
  ).not.toHaveClass("mt-1");
});

test("the menu has no settings entry", () => {
  renderFrame();

  expect(screen.queryByText(/Definições/)).toBeNull();
});

test("the CV-removed notice shows only when the CV was purged", () => {
  const notice =
    /O teu CV foi removido após o período de retenção\. Envia um novo em Informações pessoais\./;

  const { unmount } = renderFrame();
  expect(screen.queryByText(notice)).toBeNull();
  unmount();

  renderFrame({ cvPurgedAt: "2026-11-13T10:00:00.000Z" });
  expect(screen.getByText(notice)).toBeInTheDocument();
});

test("the CV-removed notice uses the highlight token, not inline colours", () => {
  renderFrame({ cvPurgedAt: "2026-11-13T10:00:00.000Z" });

  const box = screen.getByText(/O teu CV foi removido/).parentElement!;
  expect(box).not.toHaveAttribute("style");
  expect(box).toHaveClass("border-ui-highlight");
});

test("the avatar dialog is dark and labelled", () => {
  renderFrame();

  fireEvent.click(
    within(menu()).getByRole("button", { name: "Informações pessoais" })
  );
  fireEvent.click(screen.getByRole("button", { name: "Choose avatar" }));

  const dialog = screen.getByRole("dialog", { name: "Altera o teu avatar" });
  expect(dialog).toHaveClass("bg-ui-surface!", "text-white!");
  expect(
    within(dialog).getByRole("heading", { name: "Altera o teu avatar" })
  ).toHaveClass("font-sans");
});
