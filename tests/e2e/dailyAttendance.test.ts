// @vitest-environment node
import { PrismaClient } from "@prisma/client";
import { expect, test, vi } from "vitest";

import {
  countSessionCheckIns,
  createSessionCheckIn,
  findAttendanceForExport,
} from "@/application/repositories/sessionCheckInRepository";

import { databaseFixtures } from "./support/databaseFixtures";

vi.mock("server-only", () => ({}));
const db = new PrismaClient();

test("one check-in per period/day across concurrent scanners; export independent of schedule; account erasure", async () => {
  const fixtures = databaseFixtures(db);
  try {
    const student = await fixtures.student();
    const scanner = await fixtures.student();
    const morning = { day: 1, period: "MORNING" as const };
    const input = {
      ...morning,
      studentId: student.id,
      scannedById: scanner.id,
    };
    const baseline = await countSessionCheckIns(morning, db);
    const results = await Promise.allSettled([
      createSessionCheckIn(input, db),
      createSessionCheckIn(input, db),
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((x) => x.status === "rejected")).toHaveLength(1);
    expect(await countSessionCheckIns(morning, db)).toBe(baseline + 1);
    await createSessionCheckIn({ ...input, period: "AFTERNOON" }, db);
    await createSessionCheckIn({ ...input, day: 2 }, db);
    const schedule = await fixtures.schedule(999);
    await db.scheduleEvent.delete({ where: { id: schedule.id } });
    await db.user.delete({ where: { id: scanner.id } });
    expect(
      (await findAttendanceForExport(1))
        .filter((x) => x.student.name === student.name)
        .map((x) => x.period)
        .sort()
    ).toEqual(["AFTERNOON", "MORNING"]);
    expect(
      await db.attendanceCheckIn.count({
        where: { studentId: student.id, scannedById: null },
      })
    ).toBe(3);
    await db.user.delete({ where: { id: student.id } });
    expect(
      await db.attendanceCheckIn.count({ where: { studentId: student.id } })
    ).toBe(0);
  } finally {
    await fixtures.cleanup();
    await db.$disconnect();
  }
});

test("migration preserves legacy rows and imports the earliest record per half-day", async () => {
  const { readFile } = await import("node:fs/promises");
  const fixtures = databaseFixtures(db);
  let studentId: string | undefined;
  try {
    const student = await fixtures.student();
    studentId = student.id;
    const sessions = await Promise.all([
      fixtures.schedule(9000, 1),
      fixtures.schedule(9001, 1),
      fixtures.schedule(9002, 1),
    ]);
    await db.scheduleEvent.update({
      where: { id: sessions[2].id },
      data: { startTime: "14:00", endTime: "15:00" },
    });
    const times = [
      "2026-11-17T10:00:00Z",
      "2026-11-17T11:00:00Z",
      "2026-11-17T15:00:00Z",
    ];
    for (let i = 0; i < sessions.length; i++)
      await db.sessionCheckIn.create({
        data: {
          sessionId: sessions[i].id,
          studentId: student.id,
          checkedInAt: new Date(times[i]),
        },
      });
    const sql = await readFile(
      "prisma/migrations/20261117073000_daily_attendance_periods/migration.sql",
      "utf8"
    );
    await db.$executeRawUnsafe(
      sql.slice(sql.indexOf('INSERT INTO "AttendanceCheckIn"'))
    );
    const rows = await db.attendanceCheckIn.findMany({
      where: { studentId: student.id },
      orderBy: { checkedInAt: "asc" },
    });
    expect(
      rows.map((r) => [r.day, r.period, r.checkedInAt.toISOString()])
    ).toEqual([
      [1, "MORNING", "2026-11-17T10:00:00.000Z"],
      [1, "AFTERNOON", "2026-11-17T15:00:00.000Z"],
    ]);
    expect(
      await db.sessionCheckIn.count({ where: { studentId: student.id } })
    ).toBe(3);
  } finally {
    if (studentId) await db.user.deleteMany({ where: { id: studentId } });
    await fixtures.cleanup();
    await db.$disconnect();
  }
});
