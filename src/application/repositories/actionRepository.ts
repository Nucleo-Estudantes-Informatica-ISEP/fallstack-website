import "server-only";

import { actionCompletionUpsertArgs } from "@/domain/action/actionRules";

import prisma, { DbClient } from "./database";

export const findActionById = (id: string) =>
  prisma.action.findUnique({ where: { id } });

export const findActionByName = (name: string, db: DbClient = prisma) =>
  db.action.findUnique({ where: { name } });

export const findActions = () => prisma.action.findMany();

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
