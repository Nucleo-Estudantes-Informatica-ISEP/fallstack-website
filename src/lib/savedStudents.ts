import prisma from "./prisma";

export async function isSaved(companyId: string, code: string) {
  console.log("isSaved called with:", { companyId, code });
  const s = await prisma.savedStudent.findFirst({
    where: {
      AND: [{ savedBy: { companyId } }, { student: { code } }],
    },
  });

  console.log("isSaved result:", !!s, "found:", s);
  return !!s;
}
