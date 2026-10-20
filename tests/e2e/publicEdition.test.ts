// @vitest-environment node
import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

import { Language } from "@/domain/i18n/translations";

import { databaseFixtures } from "./support/databaseFixtures";

const measurement = vi.hoisted(() => ({ operations: 0 }));
vi.mock("server-only", () => ({}));
vi.mock("@/application/repositories/database", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient().$extends({
    query: {
      $allModels: {
        $allOperations({ args, query }) {
          // Query log events can arrive after completion; this hook counts before I/O.
          measurement.operations++;
          return query(args);
        },
      },
    },
  });
  return {
    default: db,
    withTransaction: <T>(operation: (tx: unknown) => Promise<T>) =>
      db.$transaction(operation),
  };
});

const { default: db } = await import("@/application/repositories/database");
const { publicDataCache } =
  await import("@/application/services/publicDataCache");
const { getHomepageData } =
  await import("@/application/services/publicEditionService");
const faqService = await import("@/application/services/faqService");
const scheduleService = await import("@/application/services/scheduleService");
const companyService = await import("@/application/services/companyService");
const sponsorService = await import("@/application/services/sponsorService");
const rankService = await import("@/application/services/companyRankService");
const interestService = await import("@/application/services/interestService");
const fixtures = databaseFixtures(db);
let faqId: string,
  scheduleId: string,
  companyId: string,
  rankId: string,
  interestId: string,
  sponsorId: string;

beforeAll(async () => {
  const faq = await fixtures.faq(923401);
  faqId = faq.id;
  scheduleId = (await fixtures.schedule(0, 413)).id;
  const company = await fixtures.company();
  companyId = company.id;
  rankId = company.rankId;
  interestId = (await fixtures.interest()).id;
  sponsorId = (
    await db.sponsor.create({
      data: {
        name: `Cache sponsor ${companyId}`,
        logo: "/logo.svg",
        active: true,
      },
    })
  ).id;
  await companyService.updateCompanyForAdmin(companyId, { active: true });
  publicDataCache.invalidate();
});

afterAll(async () => {
  publicDataCache.invalidate();
  if (sponsorId) await db.sponsor.deleteMany({ where: { id: sponsorId } });
  await fixtures.cleanup();
  await db.$disconnect();
});

async function measure(read: () => Promise<unknown>, count = 30) {
  const samples: number[] = [];
  measurement.operations = 0;
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    await read();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return {
    reads: count,
    operations: measurement.operations,
    p50ms: +samples[Math.floor(count * 0.5)].toFixed(3),
    p95ms: +samples[Math.floor(count * 0.95)].toFixed(3),
  };
}

test("real DB: warm public homepage reads issue zero DB operations; concurrent misses share each dataset", async () => {
  const uncached = () =>
    Promise.all([
      faqService.getFaqEntries(),
      scheduleService.getScheduleEvents(),
      sponsorService.getActiveSponsors(),
      companyService.getActiveCompanies(),
    ]);
  await uncached();
  const before = await measure(uncached);
  publicDataCache.invalidate();
  measurement.operations = 0;
  await getHomepageData(Language.PT);
  const coldOperations = measurement.operations;
  expect(coldOperations).toBe(4);
  const after = await measure(() => getHomepageData(Language.PT));
  expect(before.operations).toBe(120);
  expect(after.operations).toBe(0);
  publicDataCache.invalidate();
  measurement.operations = 0;
  await Promise.all(
    Array.from({ length: 100 }, () => getHomepageData(Language.PT))
  );
  expect(measurement.operations).toBe(coldOperations);
  process.stdout.write(
    `public-edition benchmark ${JSON.stringify({ before, after, coldOperations, concurrentReaders: 100 })}\n`
  );
});

test("real DB: edits, reorder, activation, rank, profile and interest changes invalidate public data in both languages", async () => {
  const read = () =>
    Promise.all([getHomepageData(Language.PT), getHomepageData(Language.EN)]);
  await read();
  await faqService.updateFaqEntryForAdmin(faqId, {
    question: { PT: "Editado?", EN: "Edited?" },
  });
  let [pt, en] = await read();
  expect(pt.faqs.find((f) => f.id === faqId)?.question).toBe("Editado?");
  expect(en.faqs.find((f) => f.id === faqId)?.question).toBe("Edited?");
  await faqService.updateFaqOrder([{ id: faqId, order: 923402 }]);
  expect((await read())[0].faqs.find((f) => f.id === faqId)?.order).toBe(
    923402
  );
  await scheduleService.updateScheduleEventForAdmin(scheduleId, {
    activity: { PT: "Editado", EN: "Edited" },
  });
  [pt, en] = await read();
  expect(pt.schedule.find((e) => e.id === scheduleId)?.activity).toBe(
    "Editado"
  );
  expect(en.schedule.find((e) => e.id === scheduleId)?.activity).toBe("Edited");
  await sponsorService.updateSponsorForAdmin(sponsorId, { active: false });
  expect((await read())[0].sponsors.some((s) => s.id === sponsorId)).toBe(
    false
  );
  await companyService.updateCompanyInterestsForAdmin(companyId, [interestId]);
  await interestService.updateInterestForAdmin(interestId, {
    PT: `IA ${companyId}`,
    EN: `AI ${companyId}`,
  });
  await rankService.updateCompanyRankForAdmin(rankId, {
    name: `Updated rank ${companyId}`,
  });
  await companyService.updateCompanyProfileForAdmin(companyId, {
    bodyText: "Public content",
  });
  [pt, en] = await read();
  const company = en.companies.find((c) => c.id === companyId)!;
  expect(company.rank.name).toBe(`Updated rank ${companyId}`);
  expect(company.hasContent).toBe(true);
  expect(company.interests).toEqual([`AI ${companyId}`]);
  expect(pt.companies.find((c) => c.id === companyId)?.interests).toEqual([
    `IA ${companyId}`,
  ]);
  await companyService.updateCompanyForAdmin(companyId, { active: false });
  expect((await read())[0].companies.some((c) => c.id === companyId)).toBe(
    false
  );
});

test("real DB: employee role changes and account deletion leave the public company intact", async () => {
  const { deleteUser, setUserRole } =
    await import("@/application/repositories/userRepository");
  const company = await fixtures.company();
  const employee = await fixtures.employee(company.id);
  await companyService.updateCompanyForAdmin(company.id, { active: true });
  const before = await companyService.getActiveCompanies();
  expect(before.some((entry) => entry.id === company.id)).toBe(true);
  await setUserRole(employee.id, "STUDENT");
  expect(await companyService.getActiveCompanies()).toEqual(before);
  await deleteUser(employee.id);
  expect(
    await db.employee.findUnique({ where: { id: employee.id } })
  ).toBeNull();
  expect(
    await db.company.findUnique({ where: { id: company.id } })
  ).not.toBeNull();
  expect(await companyService.getActiveCompanies()).toEqual(before);
});
