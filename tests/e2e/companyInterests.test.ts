import { randomUUID } from "node:crypto";
import { PrismaClient, Role } from "@prisma/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const prisma = new PrismaClient();

const { findCompanyInterests, setCompanyInterestsByName } =
  await import("../../src/application/repositories/companyRepository");

const createdUserIds: string[] = [];
const createdCompanyIds: string[] = [];
const createdRankIds: string[] = [];
const createdInterestIds: string[] = [];

afterEach(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: createdUserIds } },
  });

  await prisma.company.deleteMany({
    where: { id: { in: createdCompanyIds } },
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

test("existing and newly added employees share the same company interests", async () => {
  const suffix = randomUUID();

  const rank = await prisma.companyRank.create({
    data: {
      name: `Integration Rank ${suffix}`,
    },
  });
  createdRankIds.push(rank.id);

  const company = await prisma.company.create({
    data: {
      name: `Integration Company ${suffix}`,
      rankId: rank.id,
    },
  });
  createdCompanyIds.push(company.id);

  const ai = await prisma.interest.create({
    data: {
      name: `AI ${suffix}`,
    },
  });

  const web = await prisma.interest.create({
    data: {
      name: `Web ${suffix}`,
    },
  });

  createdInterestIds.push(ai.id, web.id);

  const firstUser = await prisma.user.create({
    data: {
      email: `employee-a-${suffix}@example.com`,
      role: Role.EMPLOYEE,
    },
  });
  createdUserIds.push(firstUser.id);

  const firstEmployee = await prisma.employee.create({
    data: {
      id: firstUser.id,
      name: "Employee A",
      companyId: company.id,
    },
  });

  await setCompanyInterestsByName(firstEmployee.companyId, [ai.name]);

  await expect(findCompanyInterests(firstEmployee.companyId)).resolves.toEqual([
    ai.name,
  ]);

  const secondUser = await prisma.user.create({
    data: {
      email: `employee-b-${suffix}@example.com`,
      role: Role.EMPLOYEE,
    },
  });
  createdUserIds.push(secondUser.id);

  const secondEmployee = await prisma.employee.create({
    data: {
      id: secondUser.id,
      name: "Employee B",
      companyId: company.id,
    },
  });

  await expect(findCompanyInterests(secondEmployee.companyId)).resolves.toEqual(
    [ai.name]
  );

  await setCompanyInterestsByName(secondEmployee.companyId, [web.name]);

  await expect(findCompanyInterests(firstEmployee.companyId)).resolves.toEqual([
    web.name,
  ]);

  const storedCompany = await prisma.company.findUniqueOrThrow({
    where: { id: company.id },
    include: { interests: true },
  });

  expect(storedCompany.interests.map((interest) => interest.name)).toEqual([
    web.name,
  ]);
});

test("company interest updates are isolated by companyId", async () => {
  const suffix = randomUUID();

  const rank = await prisma.companyRank.create({
    data: {
      name: `Isolation Rank ${suffix}`,
    },
  });
  createdRankIds.push(rank.id);

  const companyA = await prisma.company.create({
    data: {
      name: `Isolation Company A ${suffix}`,
      rankId: rank.id,
    },
  });

  const companyB = await prisma.company.create({
    data: {
      name: `Isolation Company B ${suffix}`,
      rankId: rank.id,
    },
  });

  createdCompanyIds.push(companyA.id, companyB.id);

  const ai = await prisma.interest.create({
    data: {
      name: `Isolation AI ${suffix}`,
    },
  });

  const web = await prisma.interest.create({
    data: {
      name: `Isolation Web ${suffix}`,
    },
  });

  const cloud = await prisma.interest.create({
    data: {
      name: `Isolation Cloud ${suffix}`,
    },
  });

  createdInterestIds.push(ai.id, web.id, cloud.id);

  const userA = await prisma.user.create({
    data: {
      email: `company-a-employee-${suffix}@example.com`,
      role: Role.EMPLOYEE,
    },
  });

  const userB = await prisma.user.create({
    data: {
      email: `company-b-employee-${suffix}@example.com`,
      role: Role.EMPLOYEE,
    },
  });

  createdUserIds.push(userA.id, userB.id);

  const employeeA = await prisma.employee.create({
    data: {
      id: userA.id,
      name: "Company A Employee",
      companyId: companyA.id,
    },
  });

  const employeeB = await prisma.employee.create({
    data: {
      id: userB.id,
      name: "Company B Employee",
      companyId: companyB.id,
    },
  });

  await setCompanyInterestsByName(employeeA.companyId, [ai.name]);
  await setCompanyInterestsByName(employeeB.companyId, [web.name]);

  await setCompanyInterestsByName(employeeA.companyId, [cloud.name]);

  await expect(findCompanyInterests(employeeA.companyId)).resolves.toEqual([
    cloud.name,
  ]);

  await expect(findCompanyInterests(employeeB.companyId)).resolves.toEqual([
    web.name,
  ]);
});
