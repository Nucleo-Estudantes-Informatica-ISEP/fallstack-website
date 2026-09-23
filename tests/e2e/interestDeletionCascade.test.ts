import { randomUUID } from "node:crypto";
import { PrismaClient, Role, Year } from "@prisma/client";
import { afterAll, afterEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const prisma = new PrismaClient();

const { deleteInterestForAdmin } =
  await import("../../src/application/services/interestService");

const createdUserIds: string[] = [];
const createdCompanyIds: string[] = [];
const createdRankIds: string[] = [];
const createdInterestIds: string[] = [];

afterEach(async () => {
  await prisma.company.deleteMany({
    where: { id: { in: createdCompanyIds } },
  });

  await prisma.user.deleteMany({
    where: { id: { in: createdUserIds } },
  });

  await prisma.interest.deleteMany({
    where: { id: { in: createdInterestIds } },
  });

  await prisma.companyRank.deleteMany({
    where: { id: { in: createdRankIds } },
  });

  createdUserIds.length = 0;
  createdCompanyIds.length = 0;
  createdRankIds.length = 0;
  createdInterestIds.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("deleting a linked interest removes only its join rows", async () => {
  const suffix = randomUUID();

  const rank = await prisma.companyRank.create({
    data: {
      name: `Cascade Rank ${suffix}`,
    },
  });
  createdRankIds.push(rank.id);

  const company = await prisma.company.create({
    data: {
      name: `Cascade Company ${suffix}`,
      rankId: rank.id,
    },
  });
  createdCompanyIds.push(company.id);

  const user = await prisma.user.create({
    data: {
      email: `student-${suffix}@example.com`,
      role: Role.STUDENT,
    },
  });
  createdUserIds.push(user.id);

  const student = await prisma.student.create({
    data: {
      id: user.id,
      code: `T${suffix.slice(0, 8)}`,
      name: "Cascade Student",
      year: Year.LICENCIATURA_1,
    },
  });

  const interestToDelete = await prisma.interest.create({
    data: {
      name: {
        PT: `Eliminar cascata ${suffix}`,
        EN: `Cascade Delete ${suffix}`,
      },
      students: {
        connect: { id: student.id },
      },
      companies: {
        connect: { id: company.id },
      },
    },
  });

  const interestToKeep = await prisma.interest.create({
    data: {
      name: {
        PT: `Manter cascata ${suffix}`,
        EN: `Cascade Keep ${suffix}`,
      },
      students: {
        connect: { id: student.id },
      },
      companies: {
        connect: { id: company.id },
      },
    },
  });

  createdInterestIds.push(interestToDelete.id, interestToKeep.id);

  await deleteInterestForAdmin(interestToDelete.id);

  await expect(
    prisma.interest.findUnique({
      where: { id: interestToDelete.id },
    })
  ).resolves.toBeNull();

  await expect(
    prisma.interest.findUnique({
      where: { id: interestToKeep.id },
    })
  ).resolves.not.toBeNull();

  await expect(
    prisma.student.findUnique({
      where: { id: student.id },
    })
  ).resolves.not.toBeNull();

  await expect(
    prisma.company.findUnique({
      where: { id: company.id },
    })
  ).resolves.not.toBeNull();

  const storedStudent = await prisma.student.findUniqueOrThrow({
    where: { id: student.id },
    include: { interests: true },
  });

  const storedCompany = await prisma.company.findUniqueOrThrow({
    where: { id: company.id },
    include: { interests: true },
  });

  expect(storedStudent.interests.map((interest) => interest.id)).toEqual([
    interestToKeep.id,
  ]);

  expect(storedCompany.interests.map((interest) => interest.id)).toEqual([
    interestToKeep.id,
  ]);
});
