import prisma from "./prisma";

export async function isSaved(companyId: string, code: string) {
  const s = await prisma.savedStudent.findFirst({
    where: {
      AND: [{ savedBy: { companyId } }, { student: { code } }],
    },
  });
  return !!s;
}
