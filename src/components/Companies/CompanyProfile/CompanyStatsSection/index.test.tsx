import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { SavedStudentDto } from "@/application/dto/historyDto";

import CompanyStatsSection from ".";

const { patchMock, refreshMock, toastSuccess, toastError } = vi.hoisted(() => ({
  patchMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/lib/http/client", () => ({
  httpClient: { patch: patchMock },
}));
vi.mock("react-toastify", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const INTERESTS = [
  { id: "i1", name: "Backend" },
  { id: "i2", name: "Frontend" },
];

function saved(code: string, name: string, minutesAgo = 0): SavedStudentDto {
  return {
    studentId: `id-${code}`,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    comment: null,
    student: { code, name },
  } as SavedStudentDto;
}

function renderSummary(
  props: Partial<React.ComponentProps<typeof CompanyStatsSection>> = {}
) {
  return render(
    <CompanyStatsSection
      stats={{ totalScans: 3, totalSaves: 2 }}
      students={10}
      history={[]}
      interestIds={["i1"]}
      availableInterests={INTERESTS}
      {...props}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  patchMock.mockResolvedValue({});
});

test("shows scans, saves and students left with their labels", () => {
  renderSummary();

  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("Scans")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.getByText("Gravações de Perfil")).toBeInTheDocument();
  expect(screen.getByText("7")).toBeInTheDocument();
  expect(screen.getByText("Alunos restantes")).toBeInTheDocument();
});

test("uses singular labels for one and never shows negative students left", () => {
  renderSummary({ stats: { totalScans: 1, totalSaves: 1 }, students: 0 });

  expect(screen.getByText("Scan")).toBeInTheDocument();
  expect(screen.getByText("Gravação de Perfil")).toBeInTheDocument();
  expect(screen.getByText("0")).toBeInTheDocument();
});

test("section titles are second-level headings under the dashboard title", () => {
  renderSummary();

  expect(
    screen.getByRole("heading", { level: 2, name: "Visão Geral" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { level: 2, name: "Interesses" })
  ).toBeInTheDocument();
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
});

test("interest choices are grouped under the Interesses heading", () => {
  renderSummary();

  expect(screen.getByRole("group", { name: "Interesses" })).toContainElement(
    screen.getByRole("button", { name: /Backend/ })
  );
});

test("saving interests sends the selection and confirms success", async () => {
  renderSummary();

  fireEvent.click(screen.getByRole("button", { name: /Frontend/ }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(toastSuccess).toHaveBeenCalledWith(
      "Interesses guardados com sucesso!"
    )
  );
  expect(patchMock).toHaveBeenCalledWith("/user", {
    interests: ["i1", "i2"],
  });
  expect(refreshMock).toHaveBeenCalled();
  expect(toastError).not.toHaveBeenCalled();
});

test("a failed save shows a Portuguese message and keeps the selection", async () => {
  patchMock.mockRejectedValue(new Error("Request failed"));
  renderSummary();

  fireEvent.click(screen.getByRole("button", { name: /Frontend/ }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(toastError).toHaveBeenCalledWith(
      "Não foi possível guardar os interesses. Tenta novamente."
    )
  );
  expect(toastSuccess).not.toHaveBeenCalled();
  expect(refreshMock).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /Frontend/ })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("Guardar is busy and disabled while saving", async () => {
  let finish!: () => void;
  patchMock.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    })
  );
  renderSummary();

  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  const busy = await screen.findByRole("button", { busy: true });
  expect(busy).toBeDisabled();
  finish();
  await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
});

test("shows the company's saved students", () => {
  renderSummary({ history: [saved("Z101", "Beatriz Sintética")] });

  expect(
    screen.getByRole("link", { name: "Beatriz Sintética" })
  ).toHaveAttribute("href", "/student/Z101/preview");
});
