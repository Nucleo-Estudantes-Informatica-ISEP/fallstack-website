import prisma from "./prisma";

type CompleteActionClient = {
  action: {
    findUnique(args: {
      where: { name: string };
    }): Promise<{ id: string } | null>;
  };
  student: {
    findUnique(args: {
      where: { code: string };
    }): Promise<{ id: string } | null>;
  };
  actionCompletion: {
    findFirst(args: {
      where: { studentId: string; actionId: string };
    }): Promise<unknown>;
    create(args: {
      data: { studentId: string; actionId: string };
    }): Promise<unknown>;
  };
};

export async function completeAction(
  studentCode: string,
  actionName: string,
  db: CompleteActionClient = prisma
) {
  const action = await db.action.findUnique({
    where: {
      name: actionName,
    },
  });

  if (!action) return null;

  const student = await db.student.findUnique({
    where: { code: studentCode },
  });
  if (!student) return null;

  const alreadyCompleted = await db.actionCompletion.findFirst({
    where: {
      studentId: student.id,
      actionId: action.id,
    },
  });

  if (alreadyCompleted) return null;

  const studentAction = await db.actionCompletion.create({
    data: {
      studentId: student.id,
      actionId: action.id,
    },
  });

  return studentAction;
}
