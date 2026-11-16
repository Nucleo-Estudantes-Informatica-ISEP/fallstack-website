import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import ProfileSectionContainer from ".";

vi.mock("@/hooks/useSession", () => ({
  default: () => ({ user: { student: { code: "12345" } } }),
}));
vi.mock("@/hooks/useLogout", () => ({
  useLogout: () => ({ handleLogout: vi.fn(), ConfirmDialog: null }),
}));
vi.mock("../StatsSection", () => ({ default: () => <p>Summary content</p> }));
vi.mock("../ActionsSection", () => ({
  default: () => <p>Challenges content</p>,
}));
vi.mock("../ProfileSection", () => ({ default: () => null }));
vi.mock("../UserImage", () => ({ default: () => null }));
vi.mock("../AvatarCropper", () => ({ default: () => null }));
vi.mock("@/components/PassSection/PassMenuContent", () => ({
  default: () => <p>Pass content</p>,
}));
test("menu changes focus the selected content and preserve navigation labels", () => {
  render(
    <ProfileSectionContainer
      student={
        { name: "Student", user: { email: "1234567@isep.ipp.pt" } } as never
      }
      interestIds={[]}
      globalStats={{ totalScans: 0, totalSaves: 0 }}
      todayStats={0}
      companiesLeft={0}
      historyData={[]}
      actions={[]}
      availableInterests={[]}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Passe do FallStack" }));
  expect(
    screen.getByRole("region", { name: "Passe do FallStack" })
  ).toHaveFocus();
  expect(screen.getByText("Pass content")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Desafios" }));
  expect(screen.getByRole("region", { name: "Desafios" })).toHaveFocus();
  expect(screen.getByText("Challenges content")).toBeInTheDocument();
  expect(
    screen.getByRole("navigation", { name: "Perfil" })
  ).toBeInTheDocument();
});

test("shows the staff attendance card only when allowed", () => {
  const props = {
    student: {
      name: "Student",
      user: { email: "student@example.com" },
    } as never,
    interestIds: [],
    globalStats: { totalScans: 0, totalSaves: 0 },
    todayStats: 0,
    companiesLeft: 0,
    historyData: [],
    actions: [],
    availableInterests: [],
  };
  const { rerender } = render(<ProfileSectionContainer {...props} />);
  expect(
    screen.queryByRole("link", { name: "Abrir leitor de presenças" })
  ).toBeNull();
  rerender(<ProfileSectionContainer {...props} canRecordAttendance />);
  expect(
    screen.getByRole("link", { name: "Abrir leitor de presenças" })
  ).toBeTruthy();
});
