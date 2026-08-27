import { beforeEach, expect, test, vi } from "vitest";

import {
  bulkUpdateScheduleOrder,
  createScheduleEvent,
  findAllScheduleEvents,
  findScheduleEventById,
  isUniqueSchedulePositionError,
  updateScheduleEvent,
} from "../repositories/scheduleRepository";
import { withTransaction } from "../repositories/transaction";
import {
  createScheduleEventForAdmin,
  updateScheduleEventForAdmin,
  updateScheduleOrder,
} from "./scheduleService";

vi.mock("server-only", () => ({}));
vi.mock("../repositories/scheduleRepository", () => ({
  findAllScheduleEvents: vi.fn(),
  findScheduleEventById: vi.fn(),
  createScheduleEvent: vi.fn(),
  updateScheduleEvent: vi.fn(),
  bulkUpdateScheduleOrder: vi.fn(),
  isUniqueSchedulePositionError: vi.fn(),
}));
vi.mock("../repositories/transaction", () => ({
  withTransaction: vi.fn(),
}));

const existing = [
  { id: "a", day: 1, order: 0, startTime: "09:00", endTime: "10:00" },
  { id: "b", day: 1, order: 1, startTime: "10:00", endTime: "11:00" },
];

const transaction = {} as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findAllScheduleEvents).mockResolvedValue(existing as never);
  vi.mocked(isUniqueSchedulePositionError).mockReturnValue(false);
  vi.mocked(withTransaction).mockImplementation(async (callback) =>
    callback(transaction)
  );
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

  expect(findAllScheduleEvents).toHaveBeenCalledWith(transaction);
  expect(bulkUpdateScheduleOrder).toHaveBeenCalledWith(
    [
      { id: "a", day: 1, order: 0 },
      { id: "b", day: 1, order: 1 },
    ],
    transaction
  );
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

test("rejects a partial reorder that would collide with an untouched row in the same day", async () => {
  vi.mocked(findAllScheduleEvents).mockResolvedValue([
    { id: "a", day: 1, order: 0, startTime: "09:00", endTime: "09:30" },
    { id: "b", day: 1, order: 1, startTime: "09:30", endTime: "10:00" },
    { id: "c", day: 1, order: 2, startTime: "10:00", endTime: "10:30" },
  ] as never);

  // Only moves c - a and b are untouched and not included in the update
  // list, but c's new order (0) collides with a's existing order, which
  // must still be caught even though a was never submitted.
  await expect(
    updateScheduleOrder([{ id: "c", day: 1, order: 0 }])
  ).rejects.toThrow("Schedule order is not chronologically valid");

  expect(bulkUpdateScheduleOrder).not.toHaveBeenCalled();
});

test("persists a submitted startTime/endTime alongside the reorder", async () => {
  await updateScheduleOrder([
    { id: "a", day: 1, order: 0, startTime: "08:00", endTime: "08:30" },
    { id: "b", day: 1, order: 1 },
  ]);

  expect(bulkUpdateScheduleOrder).toHaveBeenCalledWith(
    [
      { id: "a", day: 1, order: 0, startTime: "08:00", endTime: "08:30" },
      { id: "b", day: 1, order: 1 },
    ],
    transaction
  );
});

test("validates a submitted time edit against the rest of its day, not just the reorder", async () => {
  // a's submitted endTime (10:30) would overlap b's existing 10:00-11:00 -
  // must be caught even though only the order/time changed, not the day.
  await expect(
    updateScheduleOrder([
      { id: "a", day: 1, order: 0, endTime: "10:30" },
      { id: "b", day: 1, order: 1 },
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

test("a new event with no explicit order lands at the end of its day when it starts after every existing row", async () => {
  vi.mocked(createScheduleEvent).mockResolvedValue({ id: "c" } as never);

  await createScheduleEventForAdmin({
    day: 1,
    startTime: "11:00",
    endTime: "12:00",
    activity: { PT: "Palestra", EN: "Talk" },
  });

  expect(findAllScheduleEvents).toHaveBeenCalledWith(transaction);
  expect(createScheduleEvent).toHaveBeenCalledWith(
    {
      day: 1,
      startTime: "11:00",
      endTime: "12:00",
      activity: { PT: "Palestra", EN: "Talk" },
      order: 2,
    },
    transaction
  );
  expect(bulkUpdateScheduleOrder).not.toHaveBeenCalled();
});

test("a new event with no explicit order that starts earlier than every existing row is inserted first, shifting the rest", async () => {
  vi.mocked(createScheduleEvent).mockResolvedValue({ id: "c" } as never);

  await createScheduleEventForAdmin({
    day: 1,
    startTime: "08:00",
    endTime: "08:30",
    activity: { PT: "Palestra cedo", EN: "Early talk" },
  });

  expect(bulkUpdateScheduleOrder).toHaveBeenCalledWith(
    [
      { id: "a", day: 1, order: 1 },
      { id: "b", day: 1, order: 2 },
    ],
    transaction
  );
  expect(createScheduleEvent).toHaveBeenCalledWith(
    {
      day: 1,
      startTime: "08:00",
      endTime: "08:30",
      activity: { PT: "Palestra cedo", EN: "Early talk" },
      order: 0,
    },
    transaction
  );
});

test("rejects creating an event that overlaps an existing row in the same day", async () => {
  await expect(
    createScheduleEventForAdmin({
      day: 1,
      startTime: "09:30",
      endTime: "10:30",
      activity: { PT: "Sobreposição", EN: "Overlaps b" },
    })
  ).rejects.toThrow("Schedule order is not chronologically valid");

  expect(createScheduleEvent).not.toHaveBeenCalled();
  expect(bulkUpdateScheduleOrder).not.toHaveBeenCalled();
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

test("commits a valid update that keeps the row in its existing relative position", async () => {
  vi.mocked(findScheduleEventById).mockResolvedValue(existing[0] as never);
  vi.mocked(updateScheduleEvent).mockResolvedValue({ id: "a" } as never);

  await updateScheduleEventForAdmin("a", { startTime: "08:30" });

  expect(findScheduleEventById).toHaveBeenCalledWith("a", transaction);
  expect(findAllScheduleEvents).toHaveBeenCalledWith(transaction);
  expect(updateScheduleEvent).toHaveBeenCalledWith(
    "a",
    {
      startTime: "08:30",
      order: 0,
    },
    transaction
  );
  expect(bulkUpdateScheduleOrder).not.toHaveBeenCalled();
});

test("an update with no explicit order that moves a row between two others without a free order slot shifts the later one", async () => {
  vi.mocked(findAllScheduleEvents).mockResolvedValue([
    { id: "a", day: 1, order: 0, startTime: "09:00", endTime: "09:30" },
    { id: "b", day: 1, order: 1, startTime: "10:00", endTime: "10:30" },
    { id: "c", day: 1, order: 2, startTime: "11:00", endTime: "11:30" },
  ] as never);
  vi.mocked(findScheduleEventById).mockResolvedValue({
    id: "a",
    day: 1,
    order: 0,
    startTime: "09:00",
    endTime: "09:30",
  } as never);
  vi.mocked(updateScheduleEvent).mockResolvedValue({ id: "a" } as never);

  await updateScheduleEventForAdmin("a", {
    startTime: "10:35",
    endTime: "10:45",
  });

  expect(bulkUpdateScheduleOrder).toHaveBeenCalledWith(
    [{ id: "c", day: 1, order: 3 }],
    transaction
  );
  expect(updateScheduleEvent).toHaveBeenCalledWith(
    "a",
    {
      startTime: "10:35",
      endTime: "10:45",
      order: 2,
    },
    transaction
  );
});

test("surfaces a concurrent schedule position collision as a retryable 409", async () => {
  vi.mocked(bulkUpdateScheduleOrder).mockRejectedValue(new Error("P2002"));
  vi.mocked(isUniqueSchedulePositionError).mockReturnValue(true);

  await expect(
    updateScheduleOrder([
      { id: "a", day: 1, order: 0 },
      { id: "b", day: 1, order: 1 },
    ])
  ).rejects.toMatchObject({ status: 409 });
});
