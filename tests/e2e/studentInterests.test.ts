import { randomUUID } from "node:crypto";
import { PrismaClient, Role, Year } from "@prisma/client";
import { afterAll, afterEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const prisma = new PrismaClient();

const { updateStudent } =
  await import("../../src/application/services/studentService");

const createdUserIds: string[] = [];
const createdInterestIds: string[] = [];

afterEach(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: createdUserIds } },
  });

  await prisma.interest.deleteMany({
    where: { id: { in: createdInterestIds } },
  });

  createdUserIds.length = 0;
  createdInterestIds.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function storedInterestIds(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { interests: true },
  });

  return student.interests.map((interest) => interest.id).sort();
}

test("saving the profile form persists, replaces and clears a student's interests", async () => {
  const suffix = randomUUID();

  const first = await prisma.interest.create({
    data: { name: { PT: `Primeiro ${suffix}`, EN: `First ${suffix}` } },
  });
  const second = await prisma.interest.create({
    data: { name: { PT: `Segundo ${suffix}`, EN: `Second ${suffix}` } },
  });
  createdInterestIds.push(first.id, second.id);

  const code = `T${suffix.slice(0, 8)}`;
  const user = await prisma.user.create({
    data: {
      email: `student-${suffix}@example.com`,
      role: Role.STUDENT,
      student: {
        create: { name: "Student", code, year: Year.LICENCIATURA_1 },
      },
    },
  });
  createdUserIds.push(user.id);

  await updateStudent(user.id, code, {
    bio: "Updated bio",
    linkedin: "",
    github: "",
    interests: [first.id, second.id],
  });

  await expect(storedInterestIds(user.id)).resolves.toEqual(
    [first.id, second.id].sort()
  );
  await expect(
    prisma.student.findUniqueOrThrow({ where: { id: user.id } })
  ).resolves.toMatchObject({ bio: "Updated bio" });

  await updateStudent(user.id, code, { interests: [second.id] });
  await expect(storedInterestIds(user.id)).resolves.toEqual([second.id]);

  await updateStudent(user.id, code, { interests: [] });
  await expect(storedInterestIds(user.id)).resolves.toEqual([]);
});
