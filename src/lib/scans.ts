import config from "@/config";

import prisma from "./prisma";

export async function getScans() {
  const scans = await prisma.savedStudent.findMany({
    distinct: ["studentId"],
    select: {
      studentId: true,
      createdAt: true,
      student: {
        include: {
          user: true,
        },
      },
      savedBy: {
        select: { id: true },
      },
    },
    where: {
      savedBy: {
        user: {
          email: {
            equals: config.constants.neiContactEmail,
          },
        },
      },
    },
  });

  return scans.map((scan) => ({
    id: `${scan.studentId}-${scan.createdAt.toISOString()}`,
    studentId: scan.studentId,
    createdAt: scan.createdAt,
    student: scan.student,
  }));
}
