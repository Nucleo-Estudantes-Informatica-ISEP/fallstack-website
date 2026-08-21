import "server-only";

import { Prisma } from "@prisma/client";

import {
  Language,
  Translations,
  type TranslationValues,
} from "@/domain/i18n/translations";

import prisma, { DbClient } from "./database";

export const isUniqueSchedulePositionError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

export const findAllScheduleEvents = (db: DbClient = prisma) =>
  db.scheduleEvent
    .findMany({
      orderBy: [{ day: "asc" }, { order: "asc" }],
    })
    .then((events) => events.map(parseScheduleEvent));

const ADMIN_SORTABLE_FIELDS = [
  "activity",
  "day",
  "order",
  "startTime",
] as const;
export type AdminScheduleSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminScheduleQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function scheduleWhere(search?: string) {
  return search
    ? {
        OR: Object.values(Language).map((language) => ({
          activity: {
            path: [language],
            string_contains: search,
            mode: "insensitive" as const,
          },
        })),
      }
    : undefined;
}

function scheduleOrderBy(sort: string | undefined, order: "asc" | "desc") {
  const field = ADMIN_SORTABLE_FIELDS.includes(sort as AdminScheduleSortField)
    ? (sort as AdminScheduleSortField)
    : undefined;
  if (!field) return [{ day: "asc" as const }, { order: "asc" as const }];
  return { [field]: order };
}

export const countScheduleEventsForAdmin = (search?: string) =>
  prisma.scheduleEvent.count({ where: scheduleWhere(search) });

export const findScheduleEventsForAdmin = async ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminScheduleQuery) => {
  if (sort === "activity") {
    // ponytail: trusted-admin data stays tiny; move to a generated PT column
    // if translated list sorting ever needs DB-scale pagination.
    const events = (
      await prisma.scheduleEvent.findMany({ where: scheduleWhere(search) })
    )
      .map(parseScheduleEvent)
      .sort((a, b) =>
        a.activity.PT.localeCompare(b.activity.PT, "pt", {
          sensitivity: "base",
        })
      );
    if (order === "desc") events.reverse();
    return events.slice((page - 1) * pageSize, page * pageSize);
  }

  return prisma.scheduleEvent
    .findMany({
      where: scheduleWhere(search),
      orderBy: scheduleOrderBy(sort, order),
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    .then((events) => events.map(parseScheduleEvent));
};

export const findScheduleEventById = (id: string, db: DbClient = prisma) =>
  db.scheduleEvent
    .findUnique({ where: { id } })
    .then((event) => (event ? parseScheduleEvent(event) : null));

const toJson = (value: TranslationValues) =>
  Translations.create(value).toJSON() as Prisma.InputJsonObject;

function parseScheduleEvent<T extends { activity: Prisma.JsonValue }>(
  event: T
) {
  return {
    ...event,
    activity: Translations.fromJSON(event.activity).toJSON(),
  };
}

export const createScheduleEvent = (
  data: {
    day: number;
    startTime: string;
    endTime: string;
    activity: TranslationValues;
    order?: number;
  },
  db: DbClient = prisma
) =>
  db.scheduleEvent
    .create({ data: { ...data, activity: toJson(data.activity) } })
    .then(parseScheduleEvent);

export const updateScheduleEvent = (
  id: string,
  data: {
    day?: number;
    startTime?: string;
    endTime?: string;
    activity?: TranslationValues;
    order?: number;
  },
  db: DbClient = prisma
) =>
  db.scheduleEvent
    .update({
      where: { id },
      data: {
        ...data,
        activity: data.activity ? toJson(data.activity) : undefined,
      },
    })
    .then(parseScheduleEvent);

export const deleteScheduleEvent = (id: string) =>
  prisma.scheduleEvent.delete({ where: { id } });

// Takes an optional `db` so a caller can run this inside the same
// transaction as the create/update that depends on its result (see
// createScheduleEventForAdmin/updateScheduleEventForAdmin) - otherwise the
// order shift and the row write land as two separate, non-atomic
// operations. When called standalone (the default `prisma` client, e.g.
// from updateScheduleOrder) it still wraps the whole batch in its own
// transaction; a passed-in transaction client doesn't expose `$transaction`
// itself, so updates run sequentially against it instead.
export const bulkUpdateScheduleOrder = async (
  updates: {
    id: string;
    day: number;
    order: number;
    startTime?: string;
    endTime?: string;
  }[],
  db: DbClient = prisma
) => {
  if (db === prisma) {
    await prisma.$transaction(
      updates.map(({ id, day, order, startTime, endTime }) =>
        prisma.scheduleEvent.update({
          where: { id },
          data: { day, order, startTime, endTime },
        })
      )
    );
    return;
  }

  for (const { id, day, order, startTime, endTime } of updates) {
    await db.scheduleEvent.update({
      where: { id },
      data: { day, order, startTime, endTime },
    });
  }
};
