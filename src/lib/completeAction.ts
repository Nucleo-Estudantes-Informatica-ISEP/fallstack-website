import prisma from "./prisma";

export async function completeAction(studentCode: string, actionName: string) {
  const action = await prisma.action.findUnique({
    where: {
      name: actionName,
    },
  });

  if (!action) return null;

  const student = await prisma.student.findUnique({
    where: { code: studentCode },
  });
  if (!student) return null;

  const alreadyCompleted = await prisma.actionCompletion.findFirst({
    where: {
      studentId: student.id,
      actionId: action.id,
    },
  });

  if (alreadyCompleted) return null;

  const studentAction = await prisma.actionCompletion.create({
    data: {
      studentId: student.id,
      actionId: action.id,
    },
  });

  return studentAction;
}
