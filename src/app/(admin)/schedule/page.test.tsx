import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { listScheduleEventsForAdmin } from "@/application/services/scheduleService";

import ScheduleAdminPage from "./page";

vi.mock("@/application/services/scheduleService", () => ({
  listScheduleEventsForAdmin: vi.fn(),
}));

vi.mock("@/components/DataTable", () => ({
  default: () => <div data-testid="schedule-table" />,
}));

beforeEach(() => {
  vi.mocked(listScheduleEventsForAdmin).mockResolvedValue({
    items: [],
    totalCount: 0,
  });
});

test("renders the schedule reorder link in the admin page header", async () => {
  const page = await ScheduleAdminPage({
    searchParams: Promise.resolve({}),
  });

  render(page);

  expect(screen.getByRole("link", { name: "Ordenar" })).toHaveAttribute(
    "href",
    "/schedule/order"
  );

  expect(
    screen.getByRole("link", { name: "Adicionar atividade" })
  ).toHaveAttribute("href", "/schedule/new");
});
