import "server-only";

import { actionCompletionUpsertArgs } from "@/domain/action/actionRules";

import prisma, { DbClient } from "./database";

export const findActionById = (id: string) =>
  prisma.action.findUnique({
    where: { id },
    include: { company: { select: { id: true, name: true } } },
  });

export const findActionByName = (name: string, db: DbClient = prisma) =>
  db.action.findUnique({ where: { name } });

export const findActions = () => prisma.action.findMany();

const ADMIN_SORTABLE_FIELDS = [
  "name",
  "points",
  "isLive",
  "isVisible",
] as const;
export type AdminActionSortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminActionQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function actionWhere(search?: string) {
  return search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : undefined;
}

function actionOrderBy(sort: string | undefined, order: "asc" | "desc") {
  const field = ADMIN_SORTABLE_FIELDS.includes(sort as AdminActionSortField)
    ? (sort as AdminActionSortField)
    : undefined;
  return field ? { [field]: order } : { name: "asc" as const };
}

export const countActionsForAdmin = (search?: string) =>
  prisma.action.count({ where: actionWhere(search) });

export const findActionsForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminActionQuery) =>
  prisma.action.findMany({
    where: actionWhere(search),
    orderBy: actionOrderBy(sort, order),
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { company: { select: { id: true, name: true } } },
  });

export const createAction = (data: {
  name: string;
  description: string;
  points: number;
  altText?: string | null;
  isLive?: boolean;
  isVisible?: boolean;
  companyId?: string | null;
}) =>
  prisma.action.create({
    data,
    include: { company: { select: { id: true, name: true } } },
  });

export const updateActionFields = (
  id: string,
  data: {
    name?: string;
    description?: string;
    points?: number;
    altText?: string | null;
    isLive?: boolean;
    isVisible?: boolean;
    companyId?: string | null;
  }
) =>
  prisma.action.update({
    where: { id },
    data,
    include: { company: { select: { id: true, name: true } } },
  });

// Replaces edition/actions.ts's boothActions name-matching map - see #280.
// companyId is @unique, so at most one Action can be linked per company.
export const findActionByCompanyId = (
  companyId: string,
  db: DbClient = prisma
) => db.action.findUnique({ where: { companyId } });

export const findVisibleActions = () =>
  prisma.action.findMany({ where: { isVisible: true } });

export const findActionCompletions = (studentId: string) =>
  prisma.actionCompletion.findMany({ where: { studentId } });

export const createActionCompletion = (studentId: string, actionId: string) =>
  prisma.actionCompletion.create({ data: { studentId, actionId } });

export const upsertActionCompletion = (
  studentId: string,
  actionId: string,
  db: DbClient = prisma
) =>
  db.actionCompletion.upsert(actionCompletionUpsertArgs(studentId, actionId));

export const toggleAction = (id: string, isLive: boolean) =>
  prisma.action.update({ where: { id }, data: { isLive } });

export const countActionCompletions = () => prisma.actionCompletion.count();

export const findRecentActionCompletions = (limit: number) =>
  prisma.actionCompletion.findMany({
    orderBy: { completedAt: "desc" },
    take: limit,
    select: {
      completedAt: true,
      student: { select: { name: true } },
      action: { select: { name: true } },
    },
  });

// Bucketing by day happens in the service layer - this just returns the raw
// timestamps for the window, which is small enough (a single-event fair, not
// a high-volume product) that fetching rows and grouping in JS is simpler
// and more portable than a DB-side date_trunc.
export const findActionCompletionTimestampsSince = (since: Date) =>
  prisma.actionCompletion.findMany({
    where: { completedAt: { gte: since } },
    select: { completedAt: true },
  });
