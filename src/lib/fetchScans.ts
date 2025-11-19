import prisma from "./prisma";

export async function fetchScans() {
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
            equals: "info@nei-isep.org",
          },
        },
      },
    },
  });

  // Provide a synthetic id for UI/exports
  return scans.map((s) => ({
    id: `${s.studentId}-${s.createdAt.toISOString()}`,
    studentId: s.studentId,
    createdAt: s.createdAt,
    student: s.student,
  }));
}
