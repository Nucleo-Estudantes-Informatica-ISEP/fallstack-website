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
import { withTransaction } from "../repositories/transaction";

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

// The plan (order value, which rows shift, whether the result is even
// valid) is only as fresh as the read it's computed from - reading the
// day's rows before opening the transaction, then writing after, leaves a
// window where a concurrent request could change that day between the two,
// making the committed plan stale. Reading inside the same transaction as
// the write closes that window down to the transaction's own duration
// instead of a full read-then-decide-then-write round trip. This still
// isn't a full guarantee under true concurrent writers (Postgres's default
// read-committed isolation doesn't lock rows on a plain read) - see the
// Obsidian TOCTOU todo for the fuller fix (row locking / serializable
// isolation with retry, or a DB constraint on (day, order)).
export async function createScheduleEventForAdmin(input: {
  day: number;
  startTime: string;
  endTime: string;
  activity: string;
  order?: number;
}) {
  return withTransaction(async (tx) => {
    const dayRows = (await findAllScheduleEvents(tx)).filter(
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
        shifts.map((shift) => ({ ...shift, day: input.day })),
        tx
      );

    return createScheduleEvent({ ...input, order }, tx);
  });
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
  return withTransaction(async (tx) => {
    const current = await findScheduleEventById(id, tx);
    if (!current) throw new HttpError("Not found", 404);

    const day = input.day ?? current.day;
    const startTime = input.startTime ?? current.startTime;
    const endTime = input.endTime ?? current.endTime;

    const dayRows = (await findAllScheduleEvents(tx)).filter(
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
      await bulkUpdateScheduleOrder(
        shifts.map((shift) => ({ ...shift, day })),
        tx
      );

    return updateScheduleEvent(id, { ...input, order }, tx);
  });
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

  return withTransaction(async (tx) => {
    const existing = await findAllScheduleEvents(tx);
    const byId = new Map(existing.map((event) => [event.id, event]));

    const updateById = new Map(updates.map((update) => [update.id, update]));
    for (const update of updates) {
      if (!byId.has(update.id)) throw new HttpError("Not found", 404);
    }

    // Builds each affected day from every row currently in the DB - not
    // just the ones present in `updates` - so a caller submitting a
    // partial day can't hide a collision with a row it didn't include.
    // The board always sends the full board state today, but nothing else
    // enforces that.
    const byDay = new Map<
      number,
      { id: string; startTime: string; endTime: string; order: number }[]
    >();
    for (const event of existing) {
      const update = updateById.get(event.id);
      const day = update?.day ?? event.day;
      const order = update?.order ?? event.order;
      const rows = byDay.get(day) ?? [];
      rows.push({
        id: event.id,
        startTime: event.startTime,
        endTime: event.endTime,
        order,
      });
      byDay.set(day, rows);
    }

    for (const rows of byDay.values()) assertScheduleDayIsValid(rows);

    await bulkUpdateScheduleOrder(updates, tx);
  });
}
