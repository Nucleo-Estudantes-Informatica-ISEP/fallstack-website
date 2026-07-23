import "server-only";

import { HttpError } from "@/types/HttpError";
import { findInvalidScheduleRowIds } from "@/domain/schedule/scheduleValidation";

import {
  bulkUpdateScheduleOrder,
  countScheduleEventsForAdmin,
  createScheduleEvent,
  deleteScheduleEvent,
  findAllScheduleEvents,
  findMaxScheduleOrderForDay,
  findScheduleEventById,
  findScheduleEventsForAdmin,
  updateScheduleEvent,
  type AdminScheduleQuery,
} from "../repositories/scheduleRepository";

export const getScheduleEvents = () => findAllScheduleEvents();
export const getScheduleEvent = (id: string) => findScheduleEventById(id);

export async function listScheduleEventsForAdmin(query: AdminScheduleQuery) {
  const [items, totalCount] = await Promise.all([
    findScheduleEventsForAdmin(query),
    countScheduleEventsForAdmin(query.search),
  ]);
  return { items, totalCount };
}

// Re-validates the candidate row against the rest of its day's actual
// sequence before every write, not just on the reorder board's bulk
// endpoint - a plain create/edit is just as capable of producing an
// overlapping or inverted (day, order) arrangement as a drag-and-drop move.
function assertScheduleDayIsValid(
  rows: { id: string; startTime: string; endTime: string; order: number }[]
) {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  if (findInvalidScheduleRowIds(sorted).size > 0)
    throw new HttpError("Schedule order is not chronologically valid", 400);
}

export async function createScheduleEventForAdmin(input: {
  day: number;
  startTime: string;
  endTime: string;
  activity: string;
  order?: number;
}) {
  const order =
    input.order ?? (await findMaxScheduleOrderForDay(input.day)) + 1;

  const dayRows = (await findAllScheduleEvents()).filter(
    (event) => event.day === input.day
  );
  assertScheduleDayIsValid([
    ...dayRows,
    {
      id: "__new__",
      startTime: input.startTime,
      endTime: input.endTime,
      order,
    },
  ]);

  return createScheduleEvent({ ...input, order });
}

export async function updateScheduleEventForAdmin(
  id: string,
  input: {
    day?: number;
    startTime?: string;
    endTime?: string;
    activity?: string;
    order?: number;
  }
) {
  const current = await findScheduleEventById(id);
  if (!current) throw new HttpError("Not found", 404);

  const day = input.day ?? current.day;
  const startTime = input.startTime ?? current.startTime;
  const endTime = input.endTime ?? current.endTime;
  const order = input.order ?? current.order;

  const dayRows = (await findAllScheduleEvents()).filter(
    (event) => event.day === day && event.id !== id
  );
  assertScheduleDayIsValid([...dayRows, { id, startTime, endTime, order }]);

  return updateScheduleEvent(id, input);
}

export async function deleteScheduleEventForAdmin(id: string) {
  if (!(await findScheduleEventById(id))) throw new HttpError("Not found", 404);
  await deleteScheduleEvent(id);
}

// The admin board already disables "Guardar" while any row is
// chronologically invalid, but that's a client-side convenience, not a
// trust boundary - re-validate the intended new (day, order) arrangement
// here against each row's actual startTime/endTime before committing,
// same rule (domain/schedule/scheduleValidation.ts) the board uses.
export async function updateScheduleOrder(
  updates: { id: string; day: number; order: number }[]
) {
  if (updates.length === 0) return;

  const existing = await findAllScheduleEvents();
  const byId = new Map(existing.map((event) => [event.id, event]));

  const byDay = new Map<
    number,
    { id: string; startTime: string; endTime: string; order: number }[]
  >();
  for (const update of updates) {
    const current = byId.get(update.id);
    if (!current) throw new HttpError("Not found", 404);
    const rows = byDay.get(update.day) ?? [];
    rows.push({
      id: update.id,
      startTime: current.startTime,
      endTime: current.endTime,
      order: update.order,
    });
    byDay.set(update.day, rows);
  }

  for (const rows of byDay.values()) assertScheduleDayIsValid(rows);

  await bulkUpdateScheduleOrder(updates);
}
