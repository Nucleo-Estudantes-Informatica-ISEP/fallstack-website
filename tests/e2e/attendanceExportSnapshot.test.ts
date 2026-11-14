// @vitest-environment node
import { PrismaClient } from "@prisma/client";
import { expect, test, vi } from "vitest";

import { findAttendanceForExport } from "@/application/repositories/sessionCheckInRepository";

import { databaseFixtures } from "./support/databaseFixtures";

vi.mock("server-only", () => ({}));

const db = new PrismaClient();

test("exports the captured session after schedule edits and scanner deletion", async () => {
  const fixtures = databaseFixtures(db);
  let checkInId: string | undefined;
  try {
    const student = await fixtures.student();
    const scanner = await fixtures.student();
    const session = await fixtures.schedule(1, 4711);
    const checkIn = await db.sessionCheckIn.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        scannedById: scanner.id,
        // A caller cannot override the database-owned snapshot.
        sessionDay: 999,
      },
    });
    checkInId = checkIn.id;
    await db.scheduleEvent.update({
      where: { id: session.id },
      data: {
        day: 4712,
        startTime: "12:00",
        endTime: "13:00",
        activity: { PT: "Renamed", EN: "Renamed" },
      },
    });
    await db.user.delete({ where: { id: scanner.id } });
    await db.sessionCheckIn.update({
      where: { id: checkIn.id },
      data: { sessionDay: 999, sessionActivity: { PT: "Override" } },
    });
    const rows = await findAttendanceForExport(4711);
    expect(
      rows.filter((row) => row.student.name === student.name)
    ).toContainEqual({
      checkedInAt: checkIn.checkedInAt,
      student: {
        name: student.name,
        user: { email: `${student.id}@example.test` },
      },
      session: {
        day: 4711,
        startTime: "09:00",
        endTime: "10:00",
        activity: { PT: "Teste", EN: "Test" },
      },
    });
    expect(await findAttendanceForExport(4712)).toEqual([]);
    await expect(
      db.scheduleEvent.delete({ where: { id: session.id } })
    ).rejects.toMatchObject({ code: "P2003" });
    await db.user.delete({ where: { id: student.id } });
    expect(
      await db.sessionCheckIn.findUnique({ where: { id: checkIn.id } })
    ).toBeNull();
  } finally {
    if (checkInId)
      await db.sessionCheckIn.deleteMany({ where: { id: checkInId } });
    await fixtures.cleanup();
    await db.$disconnect();
  }
});
