import "server-only";

import { HttpError } from "@/types/HttpError";
import { findInvalidScheduleRowIds } from "@/domain/schedule/scheduleValidation";

import {
  bulkUpdateScheduleOrder,
  countScheduleEventsForAdmin,
  createScheduleEvent,
  deleteScheduleEvent,
  findAllScheduleEvents,
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

interface DayRow {
  id: string;
  startTime: string;
  endTime: string;
  order: number;
}

// Finds where a candidate belongs chronologically among its day's existing
// rows (by startTime), rather than defaulting to "append last" - the admin
// add/edit form never sends an explicit order, so this is what actually
// determines a row's position whenever it isn't chronologically last. Only
// shifts later rows up one order slot when there's no free gap to land in
// (e.g. inserting between two adjacent orders); an edit that keeps a row in
// its existing relative position touches no other row's order.
function planChronologicalInsert(
  dayRows: DayRow[],
  candidateStartTime: string
) {
  const sorted = [...dayRows].sort((a, b) => a.order - b.order);
  const insertIndex = sorted.findIndex(
    (row) => candidateStartTime < row.startTime
  );
  const idx = insertIndex === -1 ? sorted.length : insertIndex;

  const prevOrder = idx === 0 ? -1 : sorted[idx - 1].order;
  const nextOrder = idx < sorted.length ? sorted[idx].order : undefined;
  const order = prevOrder + 1;

  if (nextOrder === undefined || order < nextOrder)
    return { order, shifts: [], finalDayRows: sorted };

  const shifted = sorted
    .slice(idx)
    .map((row) => ({ ...row, order: row.order + 1 }));

  return {
    order,
    shifts: shifted.map(({ id, order }) => ({ id, order })),
    finalDayRows: [...sorted.slice(0, idx), ...shifted],
  };
}

export async function createScheduleEventForAdmin(input: {
  day: number;
  startTime: string;
  endTime: string;
  activity: string;
  order?: number;
}) {
  const dayRows = (await findAllScheduleEvents()).filter(
    (event) => event.day === input.day
  );

  let order = input.order;
  let shifts: { id: string; order: number }[] = [];
  let validatedDayRows: DayRow[] = dayRows;

  if (order === undefined) {
    const plan = planChronologicalInsert(dayRows, input.startTime);
    order = plan.order;
    shifts = plan.shifts;
    validatedDayRows = plan.finalDayRows;
  }

  assertScheduleDayIsValid([
    ...validatedDayRows,
    {
      id: "__new__",
      startTime: input.startTime,
      endTime: input.endTime,
      order,
    },
  ]);

  if (shifts.length > 0)
    await bulkUpdateScheduleOrder(
      shifts.map((shift) => ({ ...shift, day: input.day }))
    );

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

  const dayRows = (await findAllScheduleEvents()).filter(
    (event) => event.day === day && event.id !== id
  );

  let order = input.order;
  let shifts: { id: string; order: number }[] = [];
  let validatedDayRows: DayRow[] = dayRows;

  if (order === undefined) {
    const plan = planChronologicalInsert(dayRows, startTime);
    order = plan.order;
    shifts = plan.shifts;
    validatedDayRows = plan.finalDayRows;
  }

  assertScheduleDayIsValid([
    ...validatedDayRows,
    { id, startTime, endTime, order },
  ]);

  if (shifts.length > 0)
    await bulkUpdateScheduleOrder(shifts.map((shift) => ({ ...shift, day })));

  return updateScheduleEvent(id, { ...input, order });
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
