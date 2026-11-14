import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { StudentDto } from "@/application/dto/studentDto";

import ProfileSectionContainer from ".";

const { handleLogout, session } = vi.hoisted(() => ({
  handleLogout: vi.fn(),
  session: { user: null as unknown },
}));

vi.mock("client-only", () => ({}));
vi.mock("@/hooks/useSession", () => ({ default: () => session }));
vi.mock("@/hooks/useLogout", () => ({
  useLogout: () => ({ handleLogout, ConfirmDialog: null }),
}));
vi.mock("@/client/api/upload", () => ({ uploadAvatar: vi.fn() }));
vi.mock("@/utils/canvas", () => ({ getCroppedImg: vi.fn() }));
vi.mock("@/components/Profile/AvatarCropper", () => ({ default: () => null }));
vi.mock("@/components/ui/Modal", () => ({ default: () => null }));
vi.mock("@/components/Profile/UserImage", () => ({
  default: ({ imageSrc }: { imageSrc: string | null }) => (
    <div data-testid="avatar" data-src={imageSrc ?? ""} />
  ),
}));
vi.mock("@/components/PassSection/PassMenuContent", () => ({
  default: () => <div data-testid="pass-tab" />,
}));
vi.mock("@/components/Profile/StatsSection", () => ({
  default: () => <div data-testid="summary-tab" />,
}));
vi.mock("@/components/Profile/ActionsSection", () => ({
  default: () => <div data-testid="challenges-tab" />,
}));
vi.mock("@/components/Profile/SettingsSection", () => ({
  default: () => <div data-testid="settings-tab" />,
}));
vi.mock("@/components/Profile/ProfileSection", () => ({
  default: ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => (
    <div data-testid="info-tab">
      <button onClick={() => setActiveTab("Definições")}>open settings</button>
    </div>
  ),
}));

const STUDENT: StudentDto = {
  id: "s1",
  code: "S123",
  name: "Ana Sintética",
  bio: null,
  year: "1º Ano Licenciatura",
  course: null,
  cv: null,
  cvPurgedAt: null,
  linkedin: null,
  github: null,
  avatar: "/api/media/avatar/avatar-id",
  user: { email: "ana@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
  session.user = { student: { code: "S123" } };
});

function renderDashboard(student: Partial<StudentDto> = {}) {
  return render(
    <ProfileSectionContainer
      student={{ ...STUDENT, ...student }}
      interestIds={[]}
      globalStats={{ totalScans: 0, totalSaves: 0 }}
      todayStats={0}
      companiesLeft={0}
      historyData={[]}
      actions={[]}
      availableInterests={[]}
    />
  );
}

function menuLabels() {
  return screen
    .getAllByRole("button")
    .map((button) => button.textContent?.trim())
    .filter((label) => label !== "open settings");
}

test("a student sees Sumário, Passe, Desafios, Informações pessoais and Logout", () => {
  renderDashboard();

  expect(menuLabels()).toEqual([
    "Sumário",
    "Passe do FallStack",
    "Desafios",
    "Informações pessoais",
    "Logout",
  ]);
});

test("the pass entry is offered only to a student session", () => {
  session.user = { student: null };
  renderDashboard();

  expect(menuLabels()).toEqual([
    "Sumário",
    "Desafios",
    "Informações pessoais",
    "Logout",
  ]);
});

test("the current menu entry is marked for assistive technology", () => {
  renderDashboard();

  expect(screen.getByRole("button", { name: "Sumário" })).toHaveAttribute(
    "aria-current",
    "true"
  );

  fireEvent.click(screen.getByRole("button", { name: "Desafios" }));

  expect(screen.getByRole("button", { name: "Desafios" })).toHaveAttribute(
    "aria-current",
    "true"
  );
  expect(screen.getByRole("button", { name: "Sumário" })).not.toHaveAttribute(
    "aria-current"
  );
});

test("each menu entry shows its own content", () => {
  renderDashboard();

  expect(screen.getByTestId("summary-tab")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Passe do FallStack" }));
  expect(screen.getByTestId("pass-tab")).toBeInTheDocument();
  expect(screen.queryByTestId("summary-tab")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Desafios" }));
  expect(screen.getByTestId("challenges-tab")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Desafios" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Informações pessoais" }));
  expect(screen.getByTestId("info-tab")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Sumário" }));
  expect(screen.getByTestId("summary-tab")).toBeInTheDocument();
});

test("settings open from the personal information tab", () => {
  renderDashboard();

  fireEvent.click(screen.getByRole("button", { name: "Informações pessoais" }));
  fireEvent.click(screen.getByRole("button", { name: "open settings" }));

  expect(screen.getByTestId("settings-tab")).toBeInTheDocument();
});

test("Logout asks for confirmation instead of changing the tab", () => {
  renderDashboard();

  fireEvent.click(screen.getByRole("button", { name: "Logout" }));

  expect(handleLogout).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("summary-tab")).toBeInTheDocument();
});

test("the header shows the student's avatar, name and email", () => {
  renderDashboard();

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Ana Sintética"
  );
  expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  expect(screen.getByTestId("avatar")).toHaveAttribute(
    "data-src",
    "/api/media/avatar/avatar-id"
  );
});

test("the menu is a labelled navigation landmark", () => {
  renderDashboard();

  expect(
    screen.getByRole("navigation", { name: "Perfil" })
  ).toBeInTheDocument();
});

test("the removed-CV notice shows only after a retention purge", () => {
  const { unmount } = renderDashboard();
  expect(screen.queryByText(/O teu CV foi removido/)).toBeNull();
  unmount();

  renderDashboard({ cvPurgedAt: "2026-05-01T00:00:00.000Z" });
  expect(screen.getByText(/O teu CV foi removido/)).toBeInTheDocument();
});

test("menu changes focus the selected content and preserve navigation labels", () => {
  renderDashboard();

  fireEvent.click(screen.getByRole("button", { name: "Passe do FallStack" }));
  expect(
    screen.getByRole("region", { name: "Passe do FallStack" })
  ).toHaveFocus();
  expect(screen.getByTestId("pass-tab")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Desafios" }));
  expect(screen.getByRole("region", { name: "Desafios" })).toHaveFocus();
  expect(screen.getByTestId("challenges-tab")).toBeInTheDocument();
  expect(
    screen.getByRole("navigation", { name: "Perfil" })
  ).toBeInTheDocument();
});
