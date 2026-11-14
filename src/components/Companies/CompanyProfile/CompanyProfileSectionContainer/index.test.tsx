import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { httpClient } from "@/lib/http/client";
import type { SavedStudentDto } from "@/application/dto/historyDto";

import CompanyProfileSectionContainer from ".";

vi.mock("@/lib/http/client", () => ({ httpClient: { get: vi.fn() } }));
vi.mock("@/hooks/useLogout", () => ({
  useLogout: () => ({ handleLogout: vi.fn(), ConfirmDialog: () => null }),
}));
vi.mock("@/components/Companies/CompanyProfile/CompanyImage", () => ({
  default: () => null,
}));
vi.mock(
  "@/components/Companies/CompanyProfile/CompanySavedProfilesSection",
  () => ({
    default: () => null,
  })
);
vi.mock("@/components/Companies/CompanyProfile/CompanyStatsSection", () => ({
  default: ({ history }: { history: SavedStudentDto[] }) => (
    <div>
      {history.map((item) => (
        <span key={item.studentId}>{item.student.name}</span>
      ))}
    </div>
  ),
}));

function student(name: string): SavedStudentDto {
  return {
    studentId: name,
    createdAt: "2026-11-14T12:00:00.000Z",
    comment: null,
    student: { code: name, name },
    savedBy: { name: "Employee", company: null },
  };
}

test("a refresh discards an older pending page and permits loading from the refreshed cursor", async () => {
  let resolveOld!: (page: {
    items: SavedStudentDto[];
    hasMore: boolean;
  }) => void;
  vi.mocked(httpClient.get)
    .mockResolvedValueOnce({ items: [student("Second")], hasMore: true })
    .mockImplementationOnce(
      () =>
        new Promise<never>((resolve) => {
          resolveOld = resolve as unknown as typeof resolveOld;
        })
    )
    .mockResolvedValueOnce({ items: [student("New second")], hasMore: false });

  const props = {
    company: {} as never,
    employeeName: "Employee",
    globalStats: { totalScans: 0, totalSaves: 0 },
    totalStudents: 0,
    history: [student("First")],
    historyHasMore: true,
    interestIds: [],
    availableInterests: [],
  };
  const view = render(<CompanyProfileSectionContainer {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
  await screen.findByText("Second");
  fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
  expect(screen.getByRole("button", { name: "A carregar..." })).toBeDisabled();

  view.rerender(
    <CompanyProfileSectionContainer
      {...props}
      history={[student("Refreshed")]}
    />
  );
  expect(screen.queryByText("Second")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Carregar mais" })).toBeEnabled();
  await act(async () =>
    resolveOld({ items: [student("Old third")], hasMore: false })
  );
  expect(screen.queryByText("Old third")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
  await screen.findByText("New second");
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Carregar mais" })
    ).not.toBeInTheDocument()
  );
  expect(vi.mocked(httpClient.get).mock.calls[2][0]).toContain(
    "studentId=Refreshed"
  );
});
