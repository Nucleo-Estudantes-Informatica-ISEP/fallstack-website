import prisma from "./prisma";

export interface Stats {
  totalScans: number;
  totalSaves: number;
}

const toStats = (savedCount: number): Stats => ({
  totalScans: savedCount,
  totalSaves: savedCount,
});

export async function getStudentStats(code: string): Promise<Stats> {
  const savedCount = await prisma.savedStudent.count({
    where: {
      student: { code },
    },
  });

  return toStats(savedCount);
}

export async function getTodayStudentStats(id: string): Promise<number> {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return prisma.savedStudent.count({
    where: {
      studentId: id,
      createdAt: {
        gte: startOfDay,
      },
    },
  });
}

export async function getCompanyStats(id: string): Promise<Stats> {
  const savedCount = await prisma.savedStudent.count({
    where: {
      savedBy: {
        companyId: id,
      },
    },
  });

  return toStats(savedCount);
}
