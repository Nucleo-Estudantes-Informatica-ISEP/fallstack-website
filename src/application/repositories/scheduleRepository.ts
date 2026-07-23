import "server-only";

import prisma from "./database";

export const findAllScheduleEvents = () =>
  prisma.scheduleEvent.findMany({
    orderBy: [{ day: "asc" }, { order: "asc" }],
  });

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
    ? { activity: { contains: search, mode: "insensitive" as const } }
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

export const findScheduleEventsForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminScheduleQuery) =>
  prisma.scheduleEvent.findMany({
    where: scheduleWhere(search),
    orderBy: scheduleOrderBy(sort, order),
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

export const findScheduleEventById = (id: string) =>
  prisma.scheduleEvent.findUnique({ where: { id } });

export const createScheduleEvent = (data: {
  day: number;
  startTime: string;
  endTime: string;
  activity: string;
  order?: number;
}) => prisma.scheduleEvent.create({ data });

export const updateScheduleEvent = (
  id: string,
  data: {
    day?: number;
    startTime?: string;
    endTime?: string;
    activity?: string;
    order?: number;
  }
) => prisma.scheduleEvent.update({ where: { id }, data });

export const deleteScheduleEvent = (id: string) =>
  prisma.scheduleEvent.delete({ where: { id } });

export const bulkUpdateScheduleOrder = (
  updates: { id: string; day: number; order: number }[]
) =>
  prisma.$transaction(
    updates.map(({ id, day, order }) =>
      prisma.scheduleEvent.update({ where: { id }, data: { day, order } })
    )
  );
