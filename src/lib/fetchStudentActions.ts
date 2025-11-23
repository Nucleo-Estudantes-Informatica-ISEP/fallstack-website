import { Action } from "@prisma/client";

import prisma from "./prisma";

export async function fetchStudentActions(
  studentCode: string
): Promise<(Action & { done: boolean })[]> {
  const actions = await prisma.action.findMany({
    where: {
      isVisible: true,
    },
  });

  const student = await prisma.student.findUnique({
    where: { code: studentCode },
  });
  if (!student) return actions.map((a) => ({ ...a, done: false }));

  const concludedActions = await prisma.actionCompletion.findMany({
    where: {
      studentId: student.id,
    },
  });

  return actions.map((action) => ({
    ...action,
    done: concludedActions.some(
      (concludedAction) => concludedAction.actionId === action.id
    ),
  }));
}
