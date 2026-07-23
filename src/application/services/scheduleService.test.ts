import { beforeEach, expect, test, vi } from "vitest";

import {
  bulkUpdateScheduleOrder,
  createScheduleEvent,
  findAllScheduleEvents,
  findMaxScheduleOrderForDay,
  findScheduleEventById,
  updateScheduleEvent,
} from "../repositories/scheduleRepository";
import {
  createScheduleEventForAdmin,
  updateScheduleEventForAdmin,
  updateScheduleOrder,
} from "./scheduleService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/scheduleRepository", () => ({
  findAllScheduleEvents: vi.fn(),
  findMaxScheduleOrderForDay: vi.fn(),
  findScheduleEventById: vi.fn(),
  createScheduleEvent: vi.fn(),
  updateScheduleEvent: vi.fn(),
  bulkUpdateScheduleOrder: vi.fn(),
}));

const existing = [
  { id: "a", day: 1, order: 0, startTime: "09:00", endTime: "10:00" },
  { id: "b", day: 1, order: 1, startTime: "10:00", endTime: "11:00" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findAllScheduleEvents).mockResolvedValue(existing as never);
  vi.mocked(findMaxScheduleOrderForDay).mockResolvedValue(-1);
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

test("a new event with no explicit order lands at the end of its day", async () => {
  vi.mocked(findMaxScheduleOrderForDay).mockResolvedValue(1);
  vi.mocked(createScheduleEvent).mockResolvedValue({ id: "c" } as never);

  await createScheduleEventForAdmin({
    day: 1,
    startTime: "11:00",
    endTime: "12:00",
    activity: "Talk",
  });

  expect(createScheduleEvent).toHaveBeenCalledWith({
    day: 1,
    startTime: "11:00",
    endTime: "12:00",
    activity: "Talk",
    order: 2,
  });
});

test("rejects creating an event that overlaps an existing row in the same day", async () => {
  vi.mocked(findMaxScheduleOrderForDay).mockResolvedValue(1);

  await expect(
    createScheduleEventForAdmin({
      day: 1,
      startTime: "09:30",
      endTime: "10:30",
      activity: "Overlaps b",
    })
  ).rejects.toThrow("Schedule order is not chronologically valid");

  expect(createScheduleEvent).not.toHaveBeenCalled();
});

test("updating a missing event throws Not found before validating", async () => {
  vi.mocked(findScheduleEventById).mockResolvedValue(null);

  await expect(
    updateScheduleEventForAdmin("missing", { startTime: "09:00" })
  ).rejects.toMatchObject({ message: "Not found", status: 404 });
  expect(updateScheduleEvent).not.toHaveBeenCalled();
});

test("rejects an update that would make an event overlap its day neighbour", async () => {
  vi.mocked(findScheduleEventById).mockResolvedValue(existing[0] as never);

  await expect(
    updateScheduleEventForAdmin("a", { endTime: "10:30" })
  ).rejects.toThrow("Schedule order is not chronologically valid");

  expect(updateScheduleEvent).not.toHaveBeenCalled();
});

test("commits a valid update", async () => {
  vi.mocked(findScheduleEventById).mockResolvedValue(existing[0] as never);
  vi.mocked(updateScheduleEvent).mockResolvedValue({ id: "a" } as never);

  await updateScheduleEventForAdmin("a", { startTime: "08:30" });

  expect(updateScheduleEvent).toHaveBeenCalledWith("a", {
    startTime: "08:30",
  });
});
