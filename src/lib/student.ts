import prisma from "./prisma";

export async function getStudent(code: string) {
  return prisma.student.findUnique({
    where: {
      code,
    },
    include: {
      user: {
        include: {
          interests: true,
        },
      },
    },
  });
}
