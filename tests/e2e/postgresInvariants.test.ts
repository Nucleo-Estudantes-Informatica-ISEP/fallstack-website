// @vitest-environment node
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { afterAll, afterEach, expect, test, vi } from "vitest";

import { upsertActionCompletion } from "@/application/repositories/actionRepository";
import { findCompanyInterests } from "@/application/repositories/companyRepository";
import prisma, { withTransaction } from "@/application/repositories/database";
import { bulkUpdateFaqOrder } from "@/application/repositories/faqRepository";
import { createSavedStudent } from "@/application/repositories/savedStudentRepository";
import {
  bulkUpdateScheduleOrder,
  updateScheduleEvent,
} from "@/application/repositories/scheduleRepository";
import { updateFaqOrder } from "@/application/services/faqService";
import { saveStudent } from "@/application/services/savedStudentService";
import { updateUserInterests } from "@/application/services/userService";

import { databaseFixtures, raceTransactions } from "./support/databaseFixtures";

vi.mock("server-only", () => ({}));

const fixtures = databaseFixtures(prisma);
afterEach(() => fixtures.cleanup());
afterAll(() => prisma.$disconnect());

function expectOneWinner(
  results: PromiseSettledResult<unknown>[],
  deferred = false
) {
  expect(
    results.filter((result) => result.status === "fulfilled")
  ).toHaveLength(1);
  const failures = results.filter((result) => result.status === "rejected");
  expect(failures).toHaveLength(1);
  const error: unknown = failures[0].reason;
  expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  // Concurrent commits of deferred unique constraints can deadlock: PostgreSQL
  // aborts one writer (P2034), which still must leave exactly one committed row.
  expect(deferred ? ["P2002", "P2034"] : ["P2002"]).toContain(
    (error as Prisma.PrismaClientKnownRequestError).code
  );
}

test("concurrent duplicate ActionCompletion inserts commit exactly once", async () => {
  const student = await fixtures.student();
  const action = await fixtures.action();
  const data = { studentId: student.id, actionId: action.id };
  const results = await raceTransactions(prisma, [
    (tx) => tx.actionCompletion.create({ data }),
    (tx) => tx.actionCompletion.create({ data }),
  ]);
  expectOneWinner(results);
  expect(await prisma.actionCompletion.count({ where: data })).toBe(1);
});

test("concurrent action upserts preserve one completion and a retry reuses it", async () => {
  const student = await fixtures.student();
  const action = await fixtures.action();
  const results = await raceTransactions(prisma, [
    (tx) => upsertActionCompletion(student.id, action.id, tx),
    (tx) => upsertActionCompletion(student.id, action.id, tx),
  ]);
  expect(results.some((result) => result.status === "fulfilled")).toBe(true);
  // Prisma can emulate this empty-update upsert with a read then insert.
  // A loser may receive P2002; handling that retry is a separate runtime fix.
  for (const result of results) {
    if (result.status === "rejected") {
      expect(result.reason).toBeInstanceOf(
        Prisma.PrismaClientKnownRequestError
      );
      expect(result.reason).toMatchObject({ code: "P2002" });
    }
  }
  const rows = await prisma.actionCompletion.findMany({
    where: { studentId: student.id, actionId: action.id },
  });
  expect(rows).toHaveLength(1);
  for (const result of results) {
    if (result.status === "fulfilled") expect(result.value.id).toBe(rows[0].id);
  }
  expect((await upsertActionCompletion(student.id, action.id)).id).toBe(
    rows[0].id
  );
});

test("employees of one company cannot concurrently save a student twice", async () => {
  const student = await fixtures.student();
  const company = await fixtures.company();
  const first = await fixtures.employee(company.id);
  const second = await fixtures.employee(company.id);
  const results = await raceTransactions(prisma, [
    (tx) => createSavedStudent(student.id, first.id, company.id, tx, "first"),
    (tx) => createSavedStudent(student.id, second.id, company.id, tx, "second"),
  ]);
  expectOneWinner(results);
  const rows = await prisma.savedStudent.findMany({
    where: { studentId: student.id },
  });
  expect(rows).toHaveLength(1);
  const winner = results.find((result) => result.status === "fulfilled");
  expect(rows[0]).toEqual(winner?.value);

  const otherCompany = await fixtures.company();
  const otherEmployee = await fixtures.employee(otherCompany.id);
  await createSavedStudent(student.id, otherEmployee.id, otherCompany.id);
  expect(
    await prisma.savedStudent.count({ where: { studentId: student.id } })
  ).toBe(2);
});

test("save service maps a uniqueness race and awards booth points only once", async () => {
  const student = await fixtures.student();
  const company = await fixtures.company();
  const action = await fixtures.action(company.id);
  const employees = [
    await fixtures.employee(company.id),
    await fixtures.employee(company.id),
  ];
  const results = await Promise.allSettled(
    employees.map((employee) =>
      saveStudent({
        studentCode: student.code,
        employeeId: employee.id,
        companyId: company.id,
        // Exercise the database conflict path even if one pre-check reads after
        // the other request commits. This flag does not bypass DB uniqueness.
        allowDuplicate: true,
        completeBoothAction: true,
      })
    )
  );
  expect(
    results.filter((result) => result.status === "fulfilled")
  ).toHaveLength(1);
  const failures = results.filter((result) => result.status === "rejected");
  expect(failures).toHaveLength(1);
  expect(failures[0].reason).toMatchObject({
    status: 400,
    message: "Student already saved",
  });
  expect(
    await prisma.savedStudent.count({
      where: { studentId: student.id, companyId: company.id },
    })
  ).toBe(1);
  expect(
    await prisma.actionCompletion.count({
      where: { studentId: student.id, actionId: action.id },
    })
  ).toBe(1);
});

test("a later foreign-key failure rolls back the saved student in the same transaction", async () => {
  const student = await fixtures.student();
  const company = await fixtures.company();
  const employee = await fixtures.employee(company.id);
  await expect(
    withTransaction(async (tx) => {
      await createSavedStudent(
        student.id,
        employee.id,
        company.id,
        tx,
        "must roll back"
      );
      // A real database failure after the first write, not a mocked exception.
      await upsertActionCompletion(student.id, randomUUID(), tx);
    })
  ).rejects.toMatchObject({ code: "P2003" });
  expect(
    await prisma.savedStudent.count({ where: { studentId: student.id } })
  ).toBe(0);
  expect(
    await prisma.actionCompletion.count({ where: { studentId: student.id } })
  ).toBe(0);
});

test("concurrent schedule moves cannot occupy the same day and position", async () => {
  const first = await fixtures.schedule(0);
  const second = await fixtures.schedule(1);
  const results = await raceTransactions(prisma, [
    (tx) => updateScheduleEvent(first.id, { order: 2 }, tx),
    (tx) => updateScheduleEvent(second.id, { order: 2 }, tx),
  ]);
  expectOneWinner(results, true);
  const rows = await prisma.scheduleEvent.findMany({
    where: { id: { in: [first.id, second.id] } },
  });
  expect(rows.filter((row) => row.order === 2)).toHaveLength(1);
  const loser = results[0].status === "rejected" ? first : second;
  expect(rows.find((row) => row.id === loser.id)?.order).toBe(loser.order);
  // The same position on a different day is valid.
  await fixtures.schedule(2, 340);
});

test("schedule swaps succeed with the migrated deferred constraint", async () => {
  const first = await fixtures.schedule(0);
  const second = await fixtures.schedule(1);
  await bulkUpdateScheduleOrder([
    { id: first.id, day: first.day, order: 1 },
    { id: second.id, day: second.day, order: 0 },
  ]);
  expect(
    (await prisma.scheduleEvent.findUniqueOrThrow({ where: { id: first.id } }))
      .order
  ).toBe(1);
  expect(
    (await prisma.scheduleEvent.findUniqueOrThrow({ where: { id: second.id } }))
      .order
  ).toBe(0);
});

test("a schedule collision at commit rolls back every field and row in the batch", async () => {
  const first = await fixtures.schedule(0);
  const second = await fixtures.schedule(1);
  const occupied = await fixtures.schedule(2);
  await expect(
    bulkUpdateScheduleOrder([
      { id: first.id, day: first.day, order: 3, startTime: "08:00" },
      { id: second.id, day: second.day, order: occupied.order },
    ])
  ).rejects.toMatchObject({ code: "P2002" });
  for (const row of [first, second, occupied]) {
    expect(
      await prisma.scheduleEvent.findUniqueOrThrow({ where: { id: row.id } })
    ).toEqual(row);
  }
});

test("concurrent FAQ moves cannot occupy the same position", async () => {
  const first = await fixtures.faq(339000);
  const second = await fixtures.faq(339001);
  const results = await raceTransactions(prisma, [
    (tx) =>
      tx.faqEntry.update({ where: { id: first.id }, data: { order: 339002 } }),
    (tx) =>
      tx.faqEntry.update({ where: { id: second.id }, data: { order: 339002 } }),
  ]);
  expectOneWinner(results, true);
  const rows = await prisma.faqEntry.findMany({
    where: { id: { in: [first.id, second.id] } },
  });
  expect(rows.filter((row) => row.order === 339002)).toHaveLength(1);
  const loser = results[0].status === "rejected" ? first : second;
  expect(rows.find((row) => row.id === loser.id)?.order).toBe(loser.order);
});

test("FAQ service swaps occupied positions in one transaction", async () => {
  const first = await fixtures.faq(339000);
  const second = await fixtures.faq(339001);
  await updateFaqOrder([
    { id: first.id, order: second.order },
    { id: second.id, order: first.order },
  ]);
  expect(
    (await prisma.faqEntry.findUniqueOrThrow({ where: { id: first.id } })).order
  ).toBe(second.order);
  expect(
    (await prisma.faqEntry.findUniqueOrThrow({ where: { id: second.id } }))
      .order
  ).toBe(first.order);
});

test("FAQ service returns a conflict and rolls back a partially valid reorder", async () => {
  const first = await fixtures.faq(339000);
  const second = await fixtures.faq(339001);
  const occupied = await fixtures.faq(339002);
  await expect(
    updateFaqOrder([
      { id: first.id, order: 339003 },
      { id: second.id, order: occupied.order },
    ])
  ).rejects.toMatchObject({ status: 409 });
  for (const row of [first, second, occupied]) {
    expect(
      await prisma.faqEntry.findUniqueOrThrow({ where: { id: row.id } })
    ).toEqual(row);
  }
});

test("FAQ batch rolls back an earlier write when a later row does not exist", async () => {
  const first = await fixtures.faq(339000);
  await expect(
    bulkUpdateFaqOrder([
      { id: first.id, order: 339001 },
      { id: randomUUID(), order: 339002 },
    ])
  ).rejects.toMatchObject({ code: "P2025" });
  expect(
    await prisma.faqEntry.findUniqueOrThrow({ where: { id: first.id } })
  ).toEqual(first);
});

test("employee interest updates persist on the company without changing student interests", async () => {
  const company = await fixtures.company();
  const employee = await fixtures.employee(company.id);
  const student = await fixtures.student();
  const first = await fixtures.interest();
  const second = await fixtures.interest();
  await updateUserInterests({ userId: student.id, interests: [first.id] });
  await updateUserInterests({
    userId: employee.id,
    companyId: company.id,
    interests: [first.id],
  });
  const newcomer = await fixtures.employee(company.id);
  expect(
    (await findCompanyInterests(newcomer.companyId)).map(
      (interest) => interest.id
    )
  ).toEqual([first.id]);
  await updateUserInterests({
    userId: newcomer.id,
    companyId: company.id,
    interests: [second.id],
  });
  expect(
    (await findCompanyInterests(employee.companyId)).map(
      (interest) => interest.id
    )
  ).toEqual([second.id]);
  const stored = await prisma.student.findUniqueOrThrow({
    where: { id: student.id },
    include: { interests: true },
  });
  expect(stored.interests.map((interest) => interest.id)).toEqual([first.id]);

  // A failed replacement must restore the old join rows as well.
  await expect(
    updateUserInterests({
      userId: employee.id,
      companyId: company.id,
      interests: [randomUUID()],
    })
  ).rejects.toMatchObject({ code: "P2025" });
  expect(
    (await findCompanyInterests(company.id)).map((interest) => interest.id)
  ).toEqual([second.id]);
});
