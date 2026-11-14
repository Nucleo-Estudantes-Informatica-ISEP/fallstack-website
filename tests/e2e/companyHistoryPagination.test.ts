// @vitest-environment node
import { afterAll, afterEach, expect, test, vi } from "vitest";

import prisma from "@/application/repositories/database";
import { findCompanyHistoryPage } from "@/application/repositories/savedStudentRepository";

import { databaseFixtures } from "./support/databaseFixtures";

vi.mock("server-only", () => ({}));
const fixtures = databaseFixtures(prisma);
afterEach(() => fixtures.cleanup());
afterAll(() => prisma.$disconnect());

test("keyset pagination survives deletion, equal timestamps, and newer inserts without crossing companies", async () => {
  const company = await fixtures.company();
  const otherCompany = await fixtures.company();
  const employee = await fixtures.employee(company.id);
  const otherEmployee = await fixtures.employee(otherCompany.id);
  const createdAt = new Date("2026-11-14T12:00:00.000Z");
  const students = await Promise.all(
    Array.from({ length: 19 }, () => fixtures.student())
  );
  const sorted = students.slice(0, 17).sort((a, b) => b.id.localeCompare(a.id));
  await prisma.savedStudent.createMany({
    data: [
      ...sorted.map((student) => ({
        studentId: student.id,
        employeeId: employee.id,
        companyId: company.id,
        createdAt,
      })),
      {
        studentId: students[17].id,
        employeeId: otherEmployee.id,
        companyId: otherCompany.id,
        createdAt,
      },
    ],
  });
  const first = await findCompanyHistoryPage(company.id);
  expect(first.map((row) => row.studentId)).toEqual(
    sorted.slice(0, 16).map((row) => row.id)
  );
  const last = first[14];
  await prisma.savedStudent.delete({
    where: {
      studentId_companyId: { studentId: last.studentId, companyId: company.id },
    },
  });
  await prisma.savedStudent.create({
    data: {
      studentId: students[18].id,
      employeeId: employee.id,
      companyId: company.id,
      createdAt: new Date(createdAt.getTime() + 1000),
    },
  });
  const remaining = await findCompanyHistoryPage(company.id, {
    studentId: last.studentId,
    createdAt: last.createdAt.toISOString(),
  });
  expect(remaining.map((row) => row.studentId)).toEqual(
    sorted.slice(15).map((row) => row.id)
  );
  const indexes = await prisma.$queryRaw<
    { indexdef: string }[]
  >`SELECT indexdef FROM pg_indexes WHERE indexname = 'SavedStudent_companyId_createdAt_studentId_idx'`;
  expect(indexes[0].indexdef).toContain(
    '("companyId", "createdAt" DESC, "studentId" DESC)'
  );
});
