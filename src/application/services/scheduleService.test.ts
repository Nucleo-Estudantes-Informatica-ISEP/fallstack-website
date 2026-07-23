import { beforeEach, expect, test, vi } from "vitest";

import {
  bulkUpdateScheduleOrder,
  findAllScheduleEvents,
} from "../repositories/scheduleRepository";
import { updateScheduleOrder } from "./scheduleService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/scheduleRepository", () => ({
  findAllScheduleEvents: vi.fn(),
  bulkUpdateScheduleOrder: vi.fn(),
}));

const existing = [
  { id: "a", day: 1, order: 0, startTime: "09:00", endTime: "10:00" },
  { id: "b", day: 1, order: 1, startTime: "10:00", endTime: "11:00" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findAllScheduleEvents).mockResolvedValue(existing as never);
});

test("does nothing for an empty update list", async () => {
  await updateScheduleOrder([]);

  expect(findAllScheduleEvents).not.toHaveBeenCalled();
  expect(bulkUpdateScheduleOrder).not.toHaveBeenCalled();
});

test("commits a chronologically valid reordering", async () => {
  await updateScheduleOrder([
    { id: "a", day: 1, order: 0 },
    { id: "b", day: 1, order: 1 },
  ]);

  expect(bulkUpdateScheduleOrder).toHaveBeenCalledWith([
    { id: "a", day: 1, order: 0 },
    { id: "b", day: 1, order: 1 },
  ]);
});

test("rejects a reordering that would put a later-starting row before an earlier one, without saving", async () => {
  await expect(
    updateScheduleOrder([
      { id: "b", day: 1, order: 0 },
      { id: "a", day: 1, order: 1 },
    ])
  ).rejects.toThrow("Schedule order is not chronologically valid");

  expect(bulkUpdateScheduleOrder).not.toHaveBeenCalled();
});

test("rejects moving a row into a day where it would overlap its new neighbour", async () => {
  vi.mocked(findAllScheduleEvents).mockResolvedValue([
    { id: "a", day: 1, order: 0, startTime: "09:00", endTime: "10:00" },
    { id: "c", day: 2, order: 0, startTime: "09:30", endTime: "10:30" },
  ] as never);

  await expect(
    updateScheduleOrder([
      { id: "a", day: 2, order: 0 },
      { id: "c", day: 2, order: 1 },
    ])
  ).rejects.toThrow("Schedule order is not chronologically valid");

  expect(bulkUpdateScheduleOrder).not.toHaveBeenCalled();
});

test("throws Not found if an update references an id that no longer exists", async () => {
  await expect(
    updateScheduleOrder([{ id: "missing", day: 1, order: 0 }])
  ).rejects.toThrow("Not found");

  expect(bulkUpdateScheduleOrder).not.toHaveBeenCalled();
});
