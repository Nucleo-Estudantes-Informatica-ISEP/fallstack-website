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
    upsert(args: {
      where: {
        actionId_studentId: { studentId: string; actionId: string };
      };
      update: Record<string, never>;
      create: { studentId: string; actionId: string };
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

  return db.actionCompletion.upsert({
    where: {
      actionId_studentId: {
        studentId: student.id,
        actionId: action.id,
      },
    },
    update: {},
    create: {
      studentId: student.id,
      actionId: action.id,
    },
  });
}
