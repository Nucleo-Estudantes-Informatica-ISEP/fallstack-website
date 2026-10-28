import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, Role, Year } from "@prisma/client";

/** Tracks only this test's rows; cleanup never truncates shared tables. */
export function databaseFixtures(db: PrismaClient) {
  const ids = {
    users: [] as string[],
    companies: [] as string[],
    ranks: [] as string[],
    actions: [] as string[],
    interests: [] as string[],
    schedules: [] as string[],
    faqs: [] as string[],
  };
  const id = (kind: keyof typeof ids) => {
    const value = randomUUID();
    ids[kind].push(value);
    return value;
  };

  return {
    async company() {
      const rankId = id("ranks");
      const companyId = id("companies");
      return db.company.create({
        data: {
          id: companyId,
          name: `Integration company ${companyId}`,
          rank: { create: { id: rankId, name: `Integration rank ${rankId}` } },
        },
      });
    },
    async student() {
      const userId = id("users");
      return db.student.create({
        data: {
          code: `integration-${userId}`,
          name: "Integration student",
          year: Year.LICENCIATURA_1,
          user: {
            create: {
              id: userId,
              email: `${userId}@example.test`,
              role: Role.STUDENT,
            },
          },
        },
      });
    },
    async employee(companyId: string) {
      const userId = id("users");
      return db.employee.create({
        data: {
          name: "Integration employee",
          company: { connect: { id: companyId } },
          user: {
            create: {
              id: userId,
              email: `${userId}@example.test`,
              role: Role.EMPLOYEE,
            },
          },
        },
      });
    },
    action(companyId?: string) {
      const actionId = id("actions");
      return db.action.create({
        data: {
          id: actionId,
          name: `Integration action ${actionId}`,
          description: "Integration test",
          points: 10,
          isLive: true,
          companyId,
        },
      });
    },
    interest() {
      const interestId = id("interests");
      return db.interest.create({
        data: {
          id: interestId,
          name: { PT: `Teste ${interestId}`, EN: `Test ${interestId}` },
        },
      });
    },
    schedule(order: number, day = 339) {
      return db.scheduleEvent.create({
        data: {
          id: id("schedules"),
          day,
          order,
          startTime: "09:00",
          endTime: "10:00",
          activity: { PT: "Teste", EN: "Test" },
        },
      });
    },
    faq(order: number) {
      const faqId = id("faqs");
      return db.faqEntry.create({
        data: {
          id: faqId,
          order,
          question: { PT: `Pergunta ${faqId}`, EN: `Question ${faqId}` },
          answer: { PT: "Resposta", EN: "Answer" },
        },
      });
    },
    async cleanup() {
      await db.$transaction([
        db.scheduleEvent.deleteMany({ where: { id: { in: ids.schedules } } }),
        db.faqEntry.deleteMany({ where: { id: { in: ids.faqs } } }),
        db.user.deleteMany({ where: { id: { in: ids.users } } }),
        db.action.deleteMany({ where: { id: { in: ids.actions } } }),
        db.company.deleteMany({ where: { id: { in: ids.companies } } }),
        db.interest.deleteMany({ where: { id: { in: ids.interests } } }),
        db.companyRank.deleteMany({ where: { id: { in: ids.ranks } } }),
      ]);
      for (const values of Object.values(ids)) values.length = 0;
    },
  };
}

/** Both transactions hold separate connections before either starts writing.
 * No sleeps, retries, or assumption about which contender will win.
 * A failed connection releases the peer; transaction timeouts bound failures.
 */
export async function raceTransactions<T>(
  db: PrismaClient,
  operations: [
    (tx: Prisma.TransactionClient) => Promise<T>,
    (tx: Prisma.TransactionClient) => Promise<T>,
  ]
) {
  let ready = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return Promise.allSettled(
    operations.map((operation) =>
      db
        .$transaction(
          async (tx) => {
            if (++ready === operations.length) release();
            await gate;
            return operation(tx);
          },
          { maxWait: 5_000, timeout: 10_000 }
        )
        .finally(release)
    )
  );
}
