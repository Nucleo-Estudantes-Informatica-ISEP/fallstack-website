import prisma from "./prisma";

export async function getStats(code: string): Promise<number[]> {
  const savedCount = await prisma.savedStudent.count({
    where: {
      student: { code },
    },
  });

  // Maintain two-slot array shape [scans, saves]
  return [savedCount, savedCount];
}

export async function getTodayStats(id: string): Promise<number> {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const savedToday = await prisma.savedStudent.count({
    where: {
      studentId: id,
      createdAt: {
        gte: startOfDay,
      },
    },
  });

  return savedToday;
}

export async function getCompanyStats(id: string): Promise<number[]> {
  const savedCount = await prisma.savedStudent.count({
    where: {
      companyId: id,
    },
  });

  // Maintain two-slot array shape [scans, saves]
  return [savedCount, savedCount];
}
